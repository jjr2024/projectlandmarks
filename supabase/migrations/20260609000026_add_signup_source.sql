-- ============================================================================
-- Daysight — Signup Source Attribution Migration
-- Adds signup_source to profiles and wires handle_new_user() to populate it
-- from the `igref` auth metadata field (set at signup from the ds_igref cookie,
-- which IgrefCapture writes from the ?igref= landing-page query param).
--
-- Mirrors the existing `msclkid` attribution path (see msclkid-capture.tsx),
-- but for organic Instagram / link-in-bio traffic. Unlike msclkid, igref needs
-- no external reconciliation cron — it is purely first-party internal analytics,
-- surfaced in the admin dashboard.
--
-- Safety notes:
--   * Column is NULLABLE with no default — pre-existing rows and any signup
--     without an igref simply get NULL ("direct/unknown"). No backfill needed.
--   * handle_new_user() is replaced with the SAME body as migration 007 plus a
--     single new column. It does NOT set onboarding_completed (relies on that
--     column's default, exactly as before — see migration 025).
--   * igref is stored ONLY when it matches a strict slug pattern; any other
--     value (oversized junk, attempts to inject) is dropped to NULL. This is a
--     DB-layer backstop in addition to the client-side validation in
--     IgrefCapture / auth page.
--   * The consent self-heal upsert (consent/page.tsx) writes id/display_name/
--     consent only; a nullable signup_source does not affect it.
-- ============================================================================

-- 1. Add the column (nullable, no default).
ALTER TABLE public.profiles
  ADD COLUMN signup_source text;

COMMENT ON COLUMN public.profiles.signup_source IS
  'Organic marketing attribution slug captured from the ?igref= landing param at signup (e.g. "bio", "reel"). NULL = direct/unknown. Distinct from the msclkid ad-click id, which stays in auth metadata.';

-- 2. Replace handle_new_user() to also persist signup_source from igref.
--    Body is identical to migration 007 except for the added column.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, consent_terms, consent_emails, consent_at, signup_source)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'consent_terms')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'consent_emails')::boolean, false),
    CASE
      WHEN (new.raw_user_meta_data ->> 'consent_terms')::boolean = true
      THEN coalesce((new.raw_user_meta_data ->> 'consent_at')::timestamptz, now())
      ELSE null
    END,
    -- Store igref only if it is a well-formed slug; otherwise NULL.
    CASE
      WHEN new.raw_user_meta_data ->> 'igref' ~ '^[a-zA-Z0-9_-]{1,64}$'
      THEN new.raw_user_meta_data ->> 'igref'
      ELSE null
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
