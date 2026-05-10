-- Migration 009: Add soft-delete support for events
--
-- Matches the existing contacts soft-delete pattern (deleted_at timestamp,
-- 7-day expiry, purge cron). Previously, event deletion was a hard-delete
-- that cascaded to reminder_log and email_overrides, causing irrecoverable
-- data loss.

-- 1. Add deleted_at column (nullable, null = active)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Partial index for efficient filtering of active events
CREATE INDEX IF NOT EXISTS idx_events_user_active
ON public.events (user_id) WHERE (deleted_at IS NULL);

-- 3. Index for purge cron to find expired soft-deleted events
CREATE INDEX IF NOT EXISTS idx_events_deleted_at
ON public.events (deleted_at) WHERE (deleted_at IS NOT NULL);
