-- Migration 019: Add last_digest_sent to profiles for monthly digest dedup.
-- The digest cron checks this before sending and updates it after success,
-- preventing duplicate digests if the cron fires multiple times per month.

ALTER TABLE profiles ADD COLUMN last_digest_sent timestamptz DEFAULT NULL;
