-- Migration 011: Fix per-user email send cap index
--
-- The cap-check query in reminders/route.ts filters on:
--   user_id, created_at, status IN ('pending','sent','delivered','opened','clicked')
--
-- But the existing index (idx_reminder_log_user_sent_at) was built on:
--   user_id, sent_at, status IN ('sent','delivered','opened','clicked')
--
-- Two mismatches: wrong timestamp column (sent_at vs created_at) and
-- missing 'pending' status. This meant the index was never used for
-- the cap query, and pending rows from failed sends weren't counted,
-- potentially allowing email floods after outages.

-- Drop the old index
DROP INDEX IF EXISTS public.idx_reminder_log_user_sent_at;

-- Create the corrected index matching the actual cap-check query
CREATE INDEX idx_reminder_log_user_cap
ON public.reminder_log (user_id, created_at)
WHERE status IN ('pending', 'sent', 'delivered', 'opened', 'clicked');
