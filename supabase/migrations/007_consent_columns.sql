-- ============================================================================
-- Daysight — Consent Columns Migration
-- Adds consent_terms, consent_emails, and consent_at to profiles table
-- Updates handle_new_user() trigger to populate consent from user metadata
-- ============================================================================

-- Add consent columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN consent_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN consent_emails boolean NOT NULL DEFAULT false,
  ADD COLUMN consent_at timestamptz;

-- Update the handle_new_user() trigger function to populate consent from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, consent_terms, consent_emails, consent_at)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'consent_terms')::boolean, false),
    coalesce((new.raw_user_meta_data ->> 'consent_emails')::boolean, false),
    CASE
      WHEN (new.raw_user_meta_data ->> 'consent_terms')::boolean = true
      THEN coalesce((new.raw_user_meta_data ->> 'consent_at')::timestamptz, now())
      ELSE null
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
