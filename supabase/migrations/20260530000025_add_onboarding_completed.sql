-- Migration 025: Persist onboarding completion as a durable boolean.
--
-- Replaces the old client-side heuristic (account created in last hour + zero
-- contacts) that decided whether to route a user to /onboarding. That heuristic
-- was unreliable: users who verified email or returned after the 1-hour window
-- landed on an empty dashboard and were never guided into onboarding, and the
-- check only ran on /dashboard.
--
-- The new model: a single boolean on profiles, set true when the onboarding flow
-- finishes (after the first contact + events are saved), enforced server-side in
-- (app)/layout.tsx alongside the existing consent gate.
--
-- New signups get false via the column DEFAULT. handle_new_user() inserts the
-- profile row without referencing this column, so the default applies and new
-- users route into onboarding.

alter table profiles
  add column onboarding_completed boolean not null default false;

-- Backfill: every existing user has already cleared the old flow (or is an
-- active account with data). Mark them complete so nobody is dragged back into
-- onboarding after this ships.
update profiles set onboarding_completed = true;
