# Plan: Reliable onboarding routing via a persisted completion flag

## Problem

Whether a user lands on onboarding is currently decided in **one** client-side
spot — `src/app/(app)/dashboard/page.tsx`, inside the `load()` effect:

```js
const isNewUser = createdAt && Date.now() - createdAt.getTime() < 60 * 60 * 1000;
if (isNewUser) {
  const { count } = await supabase.from("contacts")...eq("user_id", user.id);
  if (count === 0) { router.push("/onboarding"); return; }
}
```

This is unreliable because:

- **The 1-hour window is arbitrary.** A user who verifies their email later, closes the tab, or just gets distracted returns after the window and is dropped on an empty dashboard, never guided into onboarding.
- **Only `/dashboard` checks.** Landing first on `/contacts` or `/settings` skips the check entirely.
- **No durable signal.** Completion is *inferred* from account age + contact count, not recorded.
- **Client-side only.** Runs in a `useEffect` after mount → dashboard flash, and depends on JS executing. The consent gate, by contrast, is enforced server-side.
- **Ping-pong.** Inside the first hour, a 0-contact user who deliberately leaves onboarding gets bounced back in on every dashboard visit.

## Goal

Replace the heuristic with a single persisted boolean: did this user finish
onboarding, yes or no. Enforce it server-side so every protected route honors it
and there is no flash.

## Changes

### 1. Database — new migration `20260530000025_add_onboarding_completed.sql`

Migrations use a timestamp prefix; the latest is
`20260529000024_add_contact_and_event_limits.sql`, so the next is
`202605300000025_…` (use today's date). Add a boolean to `profiles`:

```sql
ALTER TABLE profiles
  ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Backfill: every existing user has already cleared the old flow (or is an
-- active account with data). Mark them complete so nobody is dragged back in.
UPDATE profiles SET onboarding_completed = true;
```

Notes:
- New signups get `false` by default. `handle_new_user()` (defined in
  `…0001_initial_schema.sql`, updated in `…0007_consent_columns.sql`) inserts the
  profile row without mentioning this column, so the `DEFAULT false` applies and
  new users route into onboarding. **No change to `handle_new_user()` needed.**
- Boolean per the decision. If we later want to know *when* they finished, we can
  switch to a nullable `onboarding_completed_at timestamptz` (null = not done),
  which doubles as the same flag — but boolean is what we're shipping.
- Repo rule: never append to an executed migration; this is a new file. Author it
  in the SQL editor / as a fresh migration per the gift-catalog-style workflow.

### 2. Onboarding completion — `src/app/(onboarding)/onboarding/page.tsx`

The relevant handler is `handleSaveAndFinish` (~line 141), `savedRef`-guarded. It
inserts the contact, then the events, then does `savedRef.current = true;
setStep(4)` to show the "Done" screen (step 4 has manual "Go to dashboard" /
"Go to contacts" buttons — there's no auto-redirect). Set the flag on the
**success path only**, after both inserts succeed and before `setStep(4)`:

```js
      if (eventsError) throw eventsError;
    }

    // Mark onboarding complete so the server-side gate lets them into the app.
    const { error: completeError } = await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", userId);
    if (completeError) throw completeError;

    savedRef.current = true;
    setStep(4);
```

Keep it inside the `try`: the existing `catch` calls `setSaveError(friendlyError(err))`
and still advances to step 4 to show the error, so a failed flag update surfaces
to the user instead of silently leaving them un-onboarded. Because we only flip
the flag after a successful contact+events insert, "completed" always implies the
user has at least one contact (see Open product question).

### 3. Server-side gate — `src/app/(app)/layout.tsx`

Add `onboarding_completed` to the existing profile `select`, and gate right after
the `consent_terms` redirect:

```js
const { data: profile } = await supabase
  .from("profiles")
  .select("display_name, consent_terms, consent_emails, onboarding_completed")
  .eq("id", user.id)
  .single();

if (!profile?.consent_terms) redirect("/consent");
if (!profile?.onboarding_completed) redirect("/onboarding");
```

Order matters: consent first (legal gate), then onboarding. This covers
`/dashboard`, `/contacts`, `/settings` — every route under `(app)` — in one
place, server-side, with no flash.

### 4. Onboarding guard — `src/app/(onboarding)/layout.tsx`

Prevent re-running onboarding once it's done. Extend the existing consent check
to also read `onboarding_completed` and redirect completed users out:

```js
const { data: profile } = await supabase
  .from("profiles")
  .select("consent_terms, onboarding_completed")
  .eq("id", user.id)
  .single();

if (!profile?.consent_terms) redirect("/consent");
if (profile?.onboarding_completed) redirect("/dashboard");
```

### 5. Remove the old heuristic — `src/app/(app)/dashboard/page.tsx`

Delete the `isNewUser` / 1-hour / contact-count block and its `router.push("/onboarding")`
from `load()`. The server gate now owns this decision. The dashboard effect goes
back to just loading data.

### 6. Consent → onboarding hop (already handled, optional polish)

The consent page (`src/app/consent/page.tsx`, line 81) does
`window.location.href = "/dashboard"` (a full navigation, deliberately, to dodge
the Next.js Router Cache). With the server gate, an un-onboarded user hitting
`/dashboard` is immediately redirected to `/onboarding`, so the chain works
as-is. Optional: point consent straight at `/onboarding` to save one redirect —
not required, and the full-navigation comment there still applies.

## Open product question

With a hard server-side gate, a user **cannot reach the dashboard until
`onboarding_completed` is true**, and today the only way to set it true is
`handleFinish`, which requires adding at least one contact. That's stricter than
the old behavior (which let a 0-contact user sit on an empty dashboard).

Decide one of:
- **(a) Require a first contact** to finish — current onboarding already works
  this way; simplest, and matches the product's purpose.
- **(b) Add a "Skip for now" action** on the onboarding Welcome/Done step that
  sets `onboarding_completed = true` with no contact, letting them reach an empty
  dashboard intentionally.

Recommend (a) unless we want an explicit escape hatch.

## Verification

- `npx tsc --noEmit` (fast type-check; full `npm run build` reserved for a local terminal).
- Add/extend tests: a new user routes to `/onboarding`; completing it flips the
  flag and routes to `/dashboard`; a returning completed user with 0 contacts
  (e.g. deleted them all) is **not** sent back to onboarding; an un-onboarded
  user hitting `/contacts` or `/settings` is redirected.
- Manual: sign up → verify email on a second device → confirm you land in
  onboarding, finish, and stay on dashboard across reloads.

## Migration / deploy order

1. Ship migration `027` (adds column, backfills existing users to `true`).
2. Deploy code (steps 2–5) together. Safe ordering: the column exists before any
   code reads it; existing users are already `true` so no one is interrupted;
   only brand-new signups (default `false`) enter the new flow.
