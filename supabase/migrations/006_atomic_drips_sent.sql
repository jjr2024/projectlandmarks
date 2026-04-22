-- Atomic JSONB update for drips_sent to prevent race conditions
-- when concurrent cron runs try to update the same profile.
--
-- Uses the || operator to merge a new key into the existing JSONB
-- rather than the read-modify-write pattern in application code.

CREATE OR REPLACE FUNCTION public.update_drips_sent(
  p_user_id UUID,
  p_variant TEXT,
  p_sent_at TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.profiles
  SET drips_sent = COALESCE(drips_sent, '{}'::jsonb) || jsonb_build_object(p_variant, p_sent_at)
  WHERE id = p_user_id;
$$;
