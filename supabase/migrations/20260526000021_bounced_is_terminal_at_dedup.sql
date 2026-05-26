-- ============================================================================
-- Daysight — Migration 021: 'bounced' is terminal at dedup
-- ============================================================================
--
-- Background: prior to this migration, the partial unique index from
-- migration 020 covered only the "live" statuses:
--   WHERE status IN ('pending','sent','delivered','opened','clicked')
-- Bounced rows fell outside the predicate. Combined with the cron's
-- dedup SELECT also excluding 'bounced', this allowed a perverse loop:
--
--   Day 1, 8 AM:  Pass 1 sends, R1.status = 'sent'
--   Day 1, 8:01:  Resend webhook fires, R1.status = 'bounced'
--   Day 2, 8 AM:  Pass 1 sees no live row (bounced not in predicate),
--                 inserts R2 as pending → sends → bounces again
--   ... repeats daily until the event passes.
--
-- Each bounce damaged sender reputation and wasted Resend quota, and
-- the recipient was unreachable the whole time. Hard bounces are
-- permanent by Resend's contract (bad address, suppression list,
-- mailbox full, spam complaint mapped to bounced).
--
-- This migration adds 'bounced' to the partial-index predicate so a
-- bounced row occupies its tuple's dedup slot. The cron code is updated
-- in the same commit to include 'bounced' in its dedup SELECT (Pass 1
-- and Pass 2b's live-row check), so the SELECT short-circuits before
-- the INSERT even attempts.
--
-- CLEANUP: Before this migration, multiple rows could exist for the same
-- (user_id, event_id, days_before, event_date) tuple with status in the
-- new live+bounced set — most commonly a sequence of "sent → bounced"
-- pairs from the daily re-send-and-bounce loop above. The new partial
-- index requires uniqueness across that set, so the CTE below picks the
-- single most-informative row per tuple and deletes the rest.
--
-- Ranking (most informative first):
--   clicked > opened > delivered > sent > pending > bounced
-- Ties broken by most-recent created_at. Engagement signals win because
-- they prove an email reached the recipient regardless of any later
-- bounce webhook for an earlier attempt.
--
-- Deleted rows: conversion_events.reminder_id is `ON DELETE SET NULL`
-- (per migration 001), so analytics counts are preserved but the link
-- from a conversion back to its specific reminder_log row is lost for
-- the deleted attempts. This is acceptable — the link's value was
-- already low for tuples with multiple competing rows.
--
-- AUDIT BEFORE APPLYING: to see which tuples will have rows deleted:
--   SELECT user_id, event_id, days_before, event_date, count(*)
--   FROM public.reminder_log
--   WHERE status IN ('pending','sent','delivered','opened','clicked','bounced')
--   GROUP BY 1,2,3,4
--   HAVING count(*) > 1;
--
-- Run in Supabase Dashboard → SQL Editor.
-- ============================================================================

BEGIN;

-- 1. Deduplicate rows that would violate the new partial-index predicate.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, event_id, days_before, event_date
           ORDER BY
             CASE status
               WHEN 'clicked'   THEN 1
               WHEN 'opened'    THEN 2
               WHEN 'delivered' THEN 3
               WHEN 'sent'      THEN 4
               WHEN 'pending'   THEN 5
               WHEN 'bounced'   THEN 6
               ELSE 99
             END,
             created_at DESC
         ) AS rn
  FROM public.reminder_log
  WHERE status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced')
)
DELETE FROM public.reminder_log
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Replace the partial unique index with one that includes 'bounced'.
DROP INDEX IF EXISTS public.idx_reminder_log_dedup;

CREATE UNIQUE INDEX idx_reminder_log_dedup
  ON public.reminder_log (user_id, event_id, days_before, event_date)
  WHERE status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced');

-- 3. Refresh the column comment to reflect the new dedup semantics.
COMMENT ON COLUMN public.reminder_log.status IS
  'Lifecycle: pending → sent (→ delivered → opened → clicked) | bounced | failed | deferred | expired. '
  'pending = intent logged before Resend call. '
  'bounced = Resend reported a hard delivery failure (terminal — never retried). '
  'expired = stale pending (>5 min) marked by the reminder cron so a retry can proceed. '
  'failed = Resend returned a non-rate-limit error. '
  'deferred = rate-limited (429) or daily-cap-deferred; retried on next run. '
  'The first six statuses block dedup (see idx_reminder_log_dedup partial index); '
  'failed/deferred/expired do not block, but count toward MAX_RETRY_ATTEMPTS.';

COMMIT;
