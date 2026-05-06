-- Migration 013: Add optional pronoun field to contacts
-- Allowed values: he/him, she/her, they/them, other (or NULL = not set)

alter table public.contacts
  add column pronoun text
    check (pronoun in ('he/him', 'she/her', 'they/them', 'other'));
