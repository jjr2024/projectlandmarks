-- Migration 024: Enforce per-user contact limit and per-contact event limit.
--
-- These BEFORE INSERT triggers are the authoritative backstop. The contacts
-- pages provide client-side UX gating, but inserts happen via the browser anon
-- key, so the cap must also be enforced in the database where it cannot be
-- bypassed by direct API/anon-key access.
--
-- Limits (keep in sync with src/lib/constants.ts):
--   MAX_CONTACTS_PER_USER  = 100
--   MAX_EVENTS_PER_CONTACT = 10
--
-- Only non-deleted rows count (deleted_at IS NULL), matching how counts are
-- computed everywhere else in the app. Soft-deleted rows in the 7-day trash
-- window do NOT consume quota.
--
-- Triggers fire BEFORE INSERT only. Existing rows that already exceed a limit
-- are never touched, so lowering a limit in the future will not break current
-- users — it only blocks new inserts.
--
-- Concurrency note: the count + insert is not atomic, so two simultaneous
-- inserts at the boundary could both succeed (off-by-one over the cap). This is
-- acceptable for a soft abuse cap; a heavier lock is not warranted here.

create or replace function enforce_contact_limit()
returns trigger
language plpgsql
as $$
declare
  contact_count integer;
begin
  -- Only count toward the cap when inserting a live (non-deleted) contact.
  if new.deleted_at is null then
    select count(*) into contact_count
    from contacts
    where user_id = new.user_id
      and deleted_at is null;

    if contact_count >= 100 then
      raise exception 'contact limit reached: a user may have at most 100 contacts'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function enforce_event_limit()
returns trigger
language plpgsql
as $$
declare
  event_count integer;
begin
  if new.deleted_at is null then
    select count(*) into event_count
    from events
    where contact_id = new.contact_id
      and deleted_at is null;

    if event_count >= 10 then
      raise exception 'event limit reached: a contact may have at most 10 events'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_contact_limit on contacts;
create trigger trg_enforce_contact_limit
  before insert on contacts
  for each row
  execute function enforce_contact_limit();

drop trigger if exists trg_enforce_event_limit on events;
create trigger trg_enforce_event_limit
  before insert on events
  for each row
  execute function enforce_event_limit();
