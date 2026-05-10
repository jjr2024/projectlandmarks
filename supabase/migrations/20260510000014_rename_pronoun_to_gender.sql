-- Migration 014: Rename pronoun column to gender with new allowed values
-- Values: Male, Female, Other, N/A (or NULL = not set)

-- 1. Drop the existing CHECK constraint on pronoun
alter table public.contacts
  drop constraint if exists contacts_pronoun_check;

-- 2. Migrate existing data to new values
update public.contacts set pronoun = 'Male'   where pronoun = 'he/him';
update public.contacts set pronoun = 'Female' where pronoun = 'she/her';
update public.contacts set pronoun = 'Other'  where pronoun in ('they/them', 'other');

-- 3. Rename the column
alter table public.contacts
  rename column pronoun to gender;

-- 4. Add new CHECK constraint
alter table public.contacts
  add constraint contacts_gender_check
    check (gender in ('Male', 'Female', 'Other', 'N/A'));
