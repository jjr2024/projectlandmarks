-- ============================================================================
-- Daysight — Migration 020: Fix reminder_log dedup index + add 'expired' status
-- ============================================================================
--
-- Background: the email retry path was silently broken by two bugs that
-- compounded each other.
--
--   Bug 1 — status='expired' was never legal.
--     Migration 003 redefined reminder_log.status with a CHECK constraint:
--       check (status in ('pending','sent','delivered','opened','clicked',
--                         'bounced','failed','deferred'))
--     But the reminder cron's stale-pending recovery writes status='expired'
--     in two places (`reminders/route.ts:198` and `:397`). These UPDATEs
--     return a check-violation error (23514) which the code awaits but does
--     not inspect, so the row silently stayed in 'pending' forever.
--
--   Bug 2 — the dedup unique index was non-partial.
--     The original index from migration 001:
--       create unique index idx_reminder_log_dedup
--         on public.reminder_log(user_id, event_id, days_before, event_date);
--     covers ALL statuses. Even if Bug 1 had worked and an 'expired' row
--     existed, the row still occupies the unique slot, so the cron's
--     follow-up INSERT of a fresh 'pending' row hits 23505 and is silently
--     skipped (`if (pendingError.code === "23505") { results.skipped++ }`).
--
-- Net effect: a single Resend timeout, missed cron run, or transient
-- network error permanently bricked the reminder — the row sat at
-- 'pending', the unique index blocked retries, and the retry-cap query
-- (`.in("status", ["failed","expired"])`) counted a set of rows that
-- could never exist.
--
-- This migration fixes both at the schema layer:
--   1. Add 'expired' to the status CHECK constraint so the cron's
--      mark-as-expired step actually persists.
--   2. Replace the dedup unique index with a partial index covering
--      only "live" statuses (matching the cron's dedup query). Terminal
--      / abandoned rows ('expired','failed','deferred','bounced') no
--      longer occupy the unique slot, so retries can INSERT a fresh
--      'pending' row and the existing two-pass recovery works as
--      designed. The retry cap (3 failed+expired attempts) becomes
--      meaningful again because expired rows can now accumulate.
--
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================================

-- 1. Expand the status CHECK constraint to include 'expired'.
ALTER TABLE public.reminder_log
  DROP CONSTRAINT IF EXISTS reminder_log_status_check;

ALTER TABLE public.reminder_log
  ADD CONSTRAINT reminder_log_status_check
  CHECK (status IN (
    'pending',
    'sent',
    'delivered',
    'opened',
    'clicked',
    'bounced',
    'failed',
    'deferred',
    'expired'
  ));

-- 2. Replace the full unique index with a partial unique index.
--    Predicate matches the cron's dedup query at
--    src/app/api/cron/reminders/route.ts:188
--      .in("status", ["sent", "delivered", "opened", "clicked", "pending"])
--    so only "live" rows compete for the unique slot.
DROP INDEX IF EXISTS public.idx_reminder_log_dedup;

CREATE UNIQUE INDEX idx_reminder_log_dedup
  ON public.reminder_log (user_id, event_id, days_before, event_date)
  WHERE status IN ('pending', 'sent', 'delivered', 'opened', 'clicked');

-- 3. Update documentation on the status column.
COMMENT ON COLUMN public.reminder_log.status IS
  'Lifecycle: pending → sent (→ delivered → opened → clicked) | bounced | failed | deferred | expired. '
  'pending = intent logged before Resend call. '
  'expired = stale pending (>5 min) marked by the reminder cron so a retry can proceed. '
  'failed = Resend returned a non-rate-limit error. '
  'deferred = rate-limited (429) or daily-cap-deferred; retried on next run. '
  'Only the first five statuses block dedup (see idx_reminder_log_dedup partial index).';
