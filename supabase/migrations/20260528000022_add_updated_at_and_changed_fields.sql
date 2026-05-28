-- Migration 022 — Admin/debug instrumentation: updated_at + last_changed_fields
--
-- WHY: Investigating support cases like "did the user just change their reminder
-- preference?" or "was this contact freshly edited before the cron ran?" required
-- guessing from git history or asking the user. We want a cheap, durable answer
-- in the data itself.
--
-- WHAT THIS DOES:
--   1. Adds `updated_at` to `contacts` and `events` (profiles already has it),
--      backfilled from `created_at` so historical rows reflect creation time
--      rather than the moment this migration ran.
--   2. Adds `last_changed_fields text[]` to `profiles`, `contacts`, and `events` —
--      a list of column names that differed between OLD and NEW on the most
--      recent UPDATE. NULL if the row has never been updated, or if the UPDATE
--      didn't actually change any non-housekeeping field.
--   3. Defines `set_updated_at_and_changed_fields()` — a generic BEFORE UPDATE
--      trigger function that diffs OLD vs NEW via to_jsonb() and populates
--      both columns. Schema-agnostic: works through future column additions.
--   4. Switches the `profiles`, `contacts`, and `events` triggers to the new
--      function. `email_overrides` stays on the original `set_updated_at()`
--      (no debugging value, no need to instrument admin-only writes).
--
-- COMPATIBILITY: `updated_at` semantics are preserved — it still bumps to
-- now() on every UPDATE, matching the existing `set_updated_at()` behavior.
-- The only addition is the parallel `last_changed_fields` column.
--
-- COST: ~8 bytes/row for updated_at, ~40-80 bytes/row for last_changed_fields
-- under typical edit patterns. Trigger overhead is microseconds per UPDATE
-- (a single to_jsonb() conversion and a key-wise diff). Online-safe at any
-- table size we'll plausibly reach.
--
-- NOT COVERED: This is "last update" only. Field-level value history (what
-- gender changed FROM and TO) would require a separate audit table — out of
-- scope here. See CLAUDE.md for the broader debugging philosophy.

-- ── 1. Add updated_at to contacts and events ────────────────────────────────

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill existing rows so updated_at reflects creation time, not migration time.
UPDATE public.contacts SET updated_at = created_at WHERE updated_at > created_at;
UPDATE public.events   SET updated_at = created_at WHERE updated_at > created_at;

-- ── 2. Add last_changed_fields to profiles, contacts, events ────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_changed_fields text[];
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_changed_fields text[];
ALTER TABLE public.events   ADD COLUMN IF NOT EXISTS last_changed_fields text[];

-- ── 3. Generic trigger function: diff OLD vs NEW, populate both columns ─────

CREATE OR REPLACE FUNCTION public.set_updated_at_and_changed_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  changed text[];
BEGIN
  -- Compare each top-level field. JSONB equality respects DISTINCT semantics
  -- (NULL vs NULL = same, NULL vs value = different). Excluding our own
  -- housekeeping columns from the diff so they don't show up in their own list.
  SELECT array_agg(o.key ORDER BY o.key)
    INTO changed
    FROM jsonb_each(to_jsonb(OLD)) o
    JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
   WHERE o.value IS DISTINCT FROM n.value
     AND o.key NOT IN ('updated_at', 'last_changed_fields');

  NEW.updated_at = now();
  NEW.last_changed_fields = changed;  -- NULL if no real fields changed
  RETURN NEW;
END;
$$;

-- ── 4. Swap triggers on profiles, contacts, events to the new function ─────
-- email_overrides stays on the original set_updated_at() — admin-only writes,
-- no debugging value from per-field tracking.

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_changed_fields();

DROP TRIGGER IF EXISTS contacts_updated_at ON public.contacts;
CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_changed_fields();

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_and_changed_fields();
