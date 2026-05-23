-- Migration 015: Add has_pets boolean to contacts
-- Allows the gift engine to boost pet-category items for contacts with pets.

ALTER TABLE contacts
  ADD COLUMN has_pets boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN contacts.has_pets IS 'Whether this contact has pets — used to surface pet-category gift recommendations.';
