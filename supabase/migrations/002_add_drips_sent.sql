-- Add drips_sent JSONB column to profiles for re-engagement drip tracking.
-- Stores { "import_nudge": "2026-04-20T...", "sample_reminder": "2026-04-30T..." }
-- Used by the /api/cron/reengagement route to track which drip emails have been sent.

alter table public.profiles
  add column if not exists drips_sent jsonb not null default '{}';
