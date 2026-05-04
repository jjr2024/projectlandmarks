-- Migration 012: Anonymize conversion_events on account deletion.
--
-- Previously, delete_user_account() DELETEd conversion_events rows,
-- destroying analytics data (partner, category, commission, funnel stats).
-- Now we SET user_id and reminder_id to NULL instead, preserving anonymous
-- aggregate analytics while removing all PII linkage.

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. conversion_events — anonymize, don't delete.
  --    Nullify user_id + reminder_id so analytics survive without PII.
  UPDATE conversion_events
  SET user_id = NULL, reminder_id = NULL
  WHERE user_id = target_user_id;

  -- 2. email_overrides (references events and users)
  DELETE FROM email_overrides WHERE user_id = target_user_id;

  -- 3. shown_gifts (references reminder_log, events, contacts)
  DELETE FROM shown_gifts WHERE user_id = target_user_id;

  -- 4. reminder_log (references events and contacts)
  DELETE FROM reminder_log WHERE user_id = target_user_id;

  -- 5. events (references contacts)
  DELETE FROM events WHERE user_id = target_user_id;

  -- 6. contacts
  DELETE FROM contacts WHERE user_id = target_user_id;

  -- 7. profiles (the user's profile row)
  DELETE FROM profiles WHERE id = target_user_id;

  -- Note: Supabase Auth user record (auth.users) is NOT deleted here.
  -- The app calls supabase.auth.signOut() after this RPC succeeds.
  -- To fully remove the auth record, use the Supabase Admin API or dashboard.
END;
$$;
