-- ============================================================================
-- Daysight — Initial Schema Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- ── 1. Profiles ─────────────────────────────────────────────────────────────
-- Extends Supabase Auth's auth.users. One row per user, created on signup.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default '',
  timezone      text not null default 'America/New_York',
  preferred_send_hour  smallint not null default 8
    check (preferred_send_hour between 0 and 23),
  reminder_days_before smallint[] not null default '{7,3}',
  default_gift_categories text[] not null default '{gift_card}',

  -- Email preferences
  monthly_digest_enabled    boolean not null default true,
  email_reminders_enabled   boolean not null default true,
  gift_suggestions_enabled  boolean not null default true,
  product_updates_enabled   boolean not null default true,
  partner_offers_enabled    boolean not null default true,
  email_pause_until         timestamptz,

  -- Admin flag (for role-gating /admin routes)
  is_admin  boolean not null default false,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 2. Contacts ─────────────────────────────────────────────────────────────
-- Soft-delete via deleted_at. Active contacts: deleted_at IS NULL.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  first_name      text not null,
  last_name       text not null default '',
  relationship    text not null default 'friend'
    check (relationship in ('family', 'friend', 'colleague', 'other')),
  gift_categories text[] not null default '{}',
  gift_other      text not null default '',
  high_importance boolean not null default false,
  budget_tier     text check (budget_tier in ('low', 'mid', 'high')),
  notes           text not null default '',
  deleted_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_contacts_user_id on public.contacts(user_id);
create index idx_contacts_user_active on public.contacts(user_id) where deleted_at is null;

alter table public.contacts enable row level security;

create policy "Users can read own contacts"
  on public.contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own contacts"
  on public.contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contacts"
  on public.contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own contacts"
  on public.contacts for delete
  using (auth.uid() = user_id);


-- ── 3. Events ───────────────────────────────────────────────────────────────
-- Birthday, anniversary, or custom. Denormalized user_id for query efficiency.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.events (
  id              uuid primary key default gen_random_uuid(),
  contact_id      uuid not null references public.contacts(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  event_type      text not null default 'birthday'
    check (event_type in ('birthday', 'anniversary', 'custom')),
  event_label     text not null default '',
  month           smallint not null check (month between 1 and 12),
  day             smallint not null check (day between 1 and 31),
  year_started    smallint,
  one_time        boolean not null default false,
  event_year      smallint,
  high_importance boolean not null default false,
  suppress_gifts  boolean not null default false,
  created_at      timestamptz not null default now()
);

create index idx_events_user_id on public.events(user_id);
create index idx_events_contact_id on public.events(contact_id);
-- Efficient query: "all events in month X for user Y" (for cron job)
create index idx_events_user_month on public.events(user_id, month);

alter table public.events enable row level security;

create policy "Users can read own events"
  on public.events for select
  using (auth.uid() = user_id);

create policy "Users can insert own events"
  on public.events for insert
  with check (auth.uid() = user_id);

create policy "Users can update own events"
  on public.events for update
  using (auth.uid() = user_id);

create policy "Users can delete own events"
  on public.events for delete
  using (auth.uid() = user_id);


-- ── 4. Reminder Log ─────────────────────────────────────────────────────────
-- One row per reminder email sent. Tracks delivery status for dedup.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.reminder_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  event_id      uuid not null references public.events(id) on delete cascade,
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  days_before   smallint not null,
  event_date    date not null,
  sent_at       timestamptz not null default now(),
  resend_id     text,           -- Resend message ID for tracking
  status        text not null default 'sent'
    check (status in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  gift_ids      uuid[] not null default '{}',  -- which gift_catalog items were included
  created_at    timestamptz not null default now()
);

create index idx_reminder_log_user_id on public.reminder_log(user_id);
-- Dedup index: prevent sending the same reminder twice
create unique index idx_reminder_log_dedup
  on public.reminder_log(user_id, event_id, days_before, event_date);

alter table public.reminder_log enable row level security;

create policy "Users can read own reminder log"
  on public.reminder_log for select
  using (auth.uid() = user_id);

-- Only the server (service_role) inserts reminder logs — no user insert policy needed.
-- The cron job uses the service_role key, bypassing RLS.


-- ── 5. Gift Catalog ─────────────────────────────────────────────────────────
-- Curated gift items with tags for the recommendation engine.
-- Admin-managed; users have read-only access.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.gift_catalog (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  partner         text not null,           -- affiliate partner name
  affiliate_url   text not null,
  image_url       text,
  category        text not null
    check (category in ('flowers', 'wine', 'treats', 'gift_card', 'experiences', 'donation', 'home', 'accessories')),
  price_tier      text not null default 'mid'
    check (price_tier in ('low', 'mid', 'high')),
  tags            text[] not null default '{}',       -- e.g. {'romantic', 'outdoors', 'foodie'}
  relationship_affinities text[] not null default '{}', -- e.g. {'family', 'friend'}
  event_affinities        text[] not null default '{}', -- e.g. {'birthday', 'anniversary'}
  is_last_minute  boolean not null default false,     -- suitable for <3 days out
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_gift_catalog_category on public.gift_catalog(category);
create index idx_gift_catalog_active on public.gift_catalog(is_active) where is_active = true;

alter table public.gift_catalog enable row level security;

-- All authenticated users can browse the catalog (read-only)
create policy "Authenticated users can read active gifts"
  on public.gift_catalog for select
  using (auth.role() = 'authenticated');

-- Admin insert/update/delete handled via service_role key (bypasses RLS)


-- ── 6. Shown Gifts ──────────────────────────────────────────────────────────
-- Tracks which gifts were shown in each reminder (for dedup + "last year" line).
-- ─────────────────────────────────────────────────────────────────────────────
create table public.shown_gifts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  contact_id    uuid not null references public.contacts(id) on delete cascade,
  event_id      uuid references public.events(id) on delete set null,
  gift_id       uuid references public.gift_catalog(id) on delete set null,
  event_month   smallint not null check (event_month between 1 and 12),
  event_day     smallint not null check (event_day between 1 and 31),
  year          smallint not null,
  gift_name     text not null,       -- denormalized for display even if gift_catalog row is deleted
  gift_category text,
  gift_partner  text,
  created_at    timestamptz not null default now()
);

create index idx_shown_gifts_contact on public.shown_gifts(contact_id);
create index idx_shown_gifts_dedup on public.shown_gifts(contact_id, event_month, event_day, year);

alter table public.shown_gifts enable row level security;

create policy "Users can read own shown gifts"
  on public.shown_gifts for select
  using (auth.uid() = user_id);

-- Server-side insert only (cron job via service_role)


-- ── 7. Conversion Events ────────────────────────────────────────────────────
-- Funnel analytics: sent → opened → clicked → purchased.
-- Populated by Resend webhooks + affiliate postbacks.
-- ─────────────────────────────────────────────────────────────────────────────
create table public.conversion_events (
  id              uuid primary key default gen_random_uuid(),
  reminder_id     uuid references public.reminder_log(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  event_type      text not null
    check (event_type in ('sent', 'opened', 'clicked', 'purchased')),
  partner         text,
  gift_category   text,
  reminder_lead   smallint,          -- days_before value from the reminder
  commission      numeric(10,2),     -- affiliate commission earned (purchases only)
  timestamp       timestamptz not null default now()
);

create index idx_conversion_user on public.conversion_events(user_id);
create index idx_conversion_timestamp on public.conversion_events(timestamp);

alter table public.conversion_events enable row level security;

-- Only admins read conversion data (via service_role or admin check).
-- No user-facing policy needed — this is internal analytics.
create policy "Admins can read conversion events"
  on public.conversion_events for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );


-- ── 8. Utility: updated_at trigger ──────────────────────────────────────────
-- Auto-update `updated_at` on profiles and gift_catalog.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger gift_catalog_updated_at
  before update on public.gift_catalog
  for each row execute function public.set_updated_at();
