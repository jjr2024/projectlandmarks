-- ============================================================================
-- Daysight — Migration 005: Email Overrides
-- Admin-written custom messages injected into reminder emails.
-- Keyed per reminder slot: user_id + event_id + days_before + event_year.
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================================

create table public.email_overrides (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  event_id        uuid not null references public.events(id) on delete cascade,
  days_before     smallint not null,       -- canonical reminder window (21/7/3)
  event_year      smallint not null,       -- which year's occurrence this applies to
  custom_message  text not null default '',
  created_by      uuid references auth.users(id) on delete set null, -- admin who wrote it
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One override per reminder slot per year
create unique index idx_email_overrides_dedup
  on public.email_overrides(user_id, event_id, days_before, event_year);

-- Fast lookup by event for queue page
create index idx_email_overrides_event
  on public.email_overrides(event_id, event_year);

alter table public.email_overrides enable row level security;

-- Admin-only read/write (via service_role bypasses RLS; this policy covers admin UI via anon key)
create policy "Admins can manage email overrides"
  on public.email_overrides for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.is_admin = true
    )
  );

-- Auto-update updated_at
create trigger email_overrides_updated_at
  before update on public.email_overrides
  for each row execute function public.set_updated_at();
