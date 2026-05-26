# Daysight Bug & Issue Log

> Single source for open bugs, pending decisions, and fix history.
> Supersedes: Daysight_Bug_Sweep_Report.docx, daysight-bug-sweep-2026-05-25.docx, Daysight_Codebase_Audit.docx, SESSION_HANDOFF.md, Daysight_Phase9_Readiness_Review.md.

Last updated: May 26, 2026

---

## Pending Owner Decisions

**T-1. Affiliate webhook accepts unverified user_id-only postbacks**
`src/app/api/webhooks/affiliate/route.ts:63-69`
When `reminder_id` absent, `user_id` from request body is trusted. Attacker with webhook secret + valid UUID can inject fake conversions. Also: `partner` field has no regex validation (AUD-6), only length check.
Options: (A) Require reminder_id always, (B) Add HMAC to user_id postbacks, (C) Accept risk (bearer token gates access).

**T-2. Spam complaints mapped to "bounced" instead of auto-unsubscribe**
`src/app/api/webhooks/resend/route.ts:25`
`email.complained` events set status "bounced" with no suppression. Continued sends risk domain blacklisting.
Options: (A) Auto-set `consent_emails=false`, (B) Log for admin review only, (C) Suppress + send final confirmation email.

---

## Open Bugs — High

| ID | File | Issue |
|----|------|-------|
| H1 | contacts/[id]/page.tsx:579 | Event modal `onClose` bypasses `closeEventModal()` cleanup — stale error/state on next open. Fix: use `closeEventModal()` in onClose handler. |
| H2 | contacts/page.tsx:223-240 | Contact delete (`handleTrash`) ignores Supabase `.error` return. Silent failure, no user feedback. |
| H3 | contacts/[id]/page.tsx:296-303 | Event delete error writes to `eventError` but that only renders inside the edit modal, not the delete modal. User sees nothing. |
| H4 | auth/page.tsx:124-140 | `setLoading(false)` never called after successful sign-in before `router.push`. If nav stalls, button stuck disabled forever. Add finally block or timeout. |
| H5 | emails/reengagement.tsx:82-83 | Uses Unicode star character instead of self-hosted PNG logo. Inconsistent with reminder/digest templates. Replace with `<Img>` logo component. |

## Open Bugs — Medium

| ID | File | Issue |
|----|------|-------|
| M1 | contacts/page.tsx:162-165 | `closeModal()` doesn't reset `saveError`. Reopening modal shows stale error from prior attempt. |
| M2 | contacts/[id] + contacts/page.tsx | Delete confirmation modals: no loading/disabled state, double-click fires redundant writes. |
| M3 | auth/page.tsx:199-206 | `failedAttempts` not reset when toggling sign-in/sign-up. "Having trouble?" hint appears in wrong context. |
| M4 | reset-password/page.tsx:133 | Raw Supabase error shown to user. Needs `friendlyError()` wrapper. |
| M5 | middleware.ts + auth/page.tsx | No `?next=` param on auth redirect. Deep links lost after login. Must sanitize to prevent open redirects. |
| M6 | settings/page.tsx:630-634 | Recycling bin badge always shows 0 on load. Count only fetched when Bin tab selected. Need eager count query. |
| M7 | emails/reminder.tsx:204 | CTA button reads "Buy Now (Affiliate Link) →". "(Affiliate Link)" is an impl detail leaking to users. |
| M8 | emails/digest.tsx:93,177 | Subject says "Your {month} reminders" (calendar-month scope) but body is 30-day lookahead. Semantic mismatch. |
| M9 | unsubscribe/page.tsx:64,83 | Post-unsubscribe links to /settings, but logged-out users hit auth wall with no explanation. |
| M10 | unsubscribe/page.tsx | No MarketingNav or MarketingFooter. Bare screen when arriving from email. |
| M11 | consent/page.tsx:16-20 | `handleDecline` calls `signOut()` with no try/catch. If throws, button stuck on "Signing out..." forever. |
| M12 | auth/page.tsx:357-391 | Consent checkboxes: no visible error state, no `aria-describedby` on disabled submit button. |
| M13 | settings/page.tsx:178-276 | Calendar ICS download + subscription URL copy swallow errors (console.error only). No loading state. |
| M14 | sidebar.tsx:96-116 | Mobile sidebar: no close button, only closes via backdrop/nav. Keyboard/screen-reader inaccessible. `aria-hidden` inverted on backdrop. |
| M15 | settings/page.tsx:686-699 | Reminder-day toggle buttons: no `aria-pressed` or `aria-label`. |
| M17 | onboarding/page.tsx:214-220 | Removing an event doesn't clean up `advancedOpenIndexes`. New event at same index inherits expanded state. |

## Open Bugs — Low

| ID | File | Issue |
|----|------|-------|
| L1 | contacts/[id]/page.tsx:710 | Event year min = current year. Can't record past one-time events (e.g. 2020 graduation). |
| L2 | terms/page.tsx:20 | Terms "Last updated" says Jan 1, 2026. Stale placeholder. |
| L3 | page.tsx:257 | Landing page says "No waiting period" for deletion but system has 7-day purge window. |
| L4 | app/blog/page.tsx | Blog page exists but unreachable — not linked from nav or footer. |
| L5 | Multiple files | All loading states are plain gray "Loading..." text. No spinners or skeletons. |
| L6 | contacts, settings, etc. | `createClient()` called in component body every render. Should memoize or hoist. |
| L7 | layout.tsx:73 | Cookie notice renders on authenticated pages. z-50 can cover sidebar on mobile. |
| L8 | contacts/[id]/page.tsx:178-181 | Contact not found = silent redirect to /contacts. No explanation to user. |
| L9 | onboarding/page.tsx:456-471 | Event chevron SVG inconsistent with chevrons elsewhere in app. |
| L10 | onboarding/page.tsx:578-596 | High-importance tooltip CSS group-hover only. No keyboard/mobile access. |
| L12 | auth/page.tsx:211-237 | No password confirmation field on sign-up. Mistype = forced password reset. |
| L13 | contacts/[id]/page.tsx:213-216 | `dayAdjusted` banner not cleared when opening Add Event modal. |
| #17 | — | Contact form rate limit uses in-memory Map (resets on cold start). Upgrade to Redis if abused. |
| #26 | admin queue/page.tsx | Admin queue shows display_name or "Unknown". Admins can't identify users by email. |
| NEW-6 | repo root | 14 prototype HTML files + js/ folder. Move to legacy/ or archive branch. |

## Deferred / Cosmetic (no action needed)

- **#37** Day selection silently clamps (e.g. Jan 31 → Feb 28). No toast.
- **#38** Dashboard urgency color: gray at 0 days, red at >0. Minor inconsistency.
- **AUD-7** `shown_gifts` insert errors silently swallowed in cron. Acceptable — doesn't block email delivery.
- **OWN-9** Privacy policy retention timelines mismatched. GDPR legal basis vague. Needs legal review before any material change.

---

## Fix History (Condensed)

75+ issues fixed across 5 audit rounds (Apr 22 – May 26, 2026). Key milestones:

**May 25-26:** UI conformity sweep. Fixed all 4 critical onboarding bugs (URL step jump, consent gate, loading spinner, PKCE resend), onboarding `friendlyError()`, double-submission guard (`savedRef`), one-time event year validation, input styling parity, icon consistency.

**May 17-18:** Gift category overhaul (18→13 categories), XLS v2.0→v3.0, migration 016-018, image pipeline (72 product images self-hosted). Pre-update audit caught 4 critical (PostgREST `.or()` quoting, calendar one-time events, year-rollover dedup, `listUsers()` pagination) — all fixed same session.

**May 1-10:** Codebase audit. Fixed event soft-delete cascade, RLS write policies, email send cap index, hardcoded domain → `APP_URL`, digest dedup (idempotency keys + `last_digest_sent`), re-engagement pre-send dedup, timezone-aware send-hour gating, account deletion → `auth.admin.deleteUser()`, consent self-heal upsert.

**Apr 22 – May 6:** Initial 38-issue sweep + 7 new. Fixed 50 items: security hardening (open redirect, webhook auth, timing-safe tokens, HMAC URLs), auth (verification banner, reauthenticate, PKCE), email resilience (atomic drips, two-pass retry, stale pending recovery), UI/UX (friendlyError everywhere, modal a11y, recycling bin), schema (soft-delete, gender/pronoun migration, RLS deny policies).

**Cron reliability (May 2026):** Moved from Vercel Hobby (once/day, unpredictable hour) to GitHub Actions hourly cron as primary trigger. Fixed stuck-pending dedup (rows now expire after 5 min, two-pass retry across all users). See CLAUDE.md § "Email Resilience" and "Debugging History" for full technical detail.
