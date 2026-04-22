-- ============================================================================
-- Daysight — Migration 003: Email Resilience
-- Adds 'pending'/'deferred' status to reminder_log for pre-send logging,
-- and an index for per-user daily send cap queries.
-- Run in Supabase Dashboard → SQL Editor (do NOT append to 001/002).
-- ============================================================================

-- 1. Expand reminder_log.status to include pre-send and backlog states
alter table public.reminder_log
  drop constraint if exists reminder_log_status_check;

alter table public.reminder_log
  add constraint reminder_log_status_check
  check (status in ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'deferred'));

-- 2. Index for per-user daily send cap: "how many emails did this user get today?"
-- Used by cron route to enforce max emails per user per 24h window.
create index idx_reminder_log_user_sent_at
  on public.reminder_log(user_id, sent_at)
  where status in ('sent', 'delivered', 'opened', 'clicked');

-- 3. Allow pending rows to have null resend_id (already nullable, but make intent clear)
comment on column public.reminder_log.resend_id is
  'Resend message ID. NULL while status=pending (pre-send). Populated on successful send.';

comment on column public.reminder_log.status is
  'Lifecycle: pending → sent/failed/deferred. pending = intent logged before Resend call. deferred = skipped due to rate limit or daily cap.';
