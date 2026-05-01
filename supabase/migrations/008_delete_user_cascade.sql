-- Migration 008: Atomic account deletion via RPC function.
--
-- Deletes all user data in a single transaction to prevent orphaned rows.
-- Order matters due to foreign key constraints:
--   conversion_events → reminder_log → shown_gifts → events → contacts → email_overrides → profiles
--
-- Called from the settings page via supabase.rpc('delete_user_account', { target_user_id: ... })

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is deleting their own account (or is admin)
  -- SECURITY DEFINER runs as the function owner (postgres), so RLS is bypassed.
  -- The app layer must ensure only the authenticated user calls this for their own ID.

  -- 1. conversion_events (references reminder_log.id via reminder_id)
  DELETE FROM conversion_events WHERE user_id = target_user_id;

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
