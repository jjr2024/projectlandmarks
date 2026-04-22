# Daysight — Phase 9 Go-Live Readiness Review

**Date:** April 22, 2026  
**Scope:** Security, email system, frontend, schema, and configuration  
**Verdict:** Not yet ready for public launch. 5 blockers, 8 high-priority items, several medium/low.

---

## Blockers (must fix before launch)

### 1. Digest route uses wrong column name — will crash at runtime
**File:** `src/app/api/cron/digest/route.ts` line 48  
**Issue:** Queries `.select("display_name, monthly_digest, timezone")` but the schema defines the column as `monthly_digest_enabled` (migration 001, line 19). The digest cron will throw a column-not-found error every time it runs.  
**Fix:** Change to `monthly_digest_enabled` in the select and the conditional check on line 52.

### 2. Webhook secrets are optional — unauthenticated when env vars are unset
**File:** `src/app/api/webhooks/resend/route.ts` lines 36–41, `affiliate/route.ts` lines 23–29  
**Issue:** Both webhook routes wrap their auth check in `if (webhookSecret)` / `if (secret)`, meaning if the env var is unset, the route processes all requests with no authentication. An attacker could inject fake `email.opened` events to inflate analytics or fake `purchased` events with arbitrary commission values.  
**Fix:** Make both secrets required. Return 500 with "webhook secret not configured" if missing, rather than silently skipping auth.

### 3. Reengagement route uses hardcoded `from` address inconsistent with other emails
**File:** `src/app/api/cron/reengagement/route.ts` line 77  
**Issue:** Hardcodes `from: "Daysight <hello@daysight.xyz>"` while reminder emails use `EMAIL_CONFIG.from` (`reminders@daysight.xyz`). Inconsistent sender addresses fragment domain reputation and confuse spam filters.  
**Fix:** Import and use `EMAIL_CONFIG.from` consistently across all three cron routes.

### 4. No environment variable validation at startup
**Issue:** All env vars (`CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, webhook secrets) are accessed at runtime without checking they exist. The app builds and deploys successfully with missing vars, then fails with cryptic errors on first use. The Resend client (`src/lib/resend.ts`) silently accepts `undefined` as the API key.  
**Fix:** Create `src/lib/env.ts` with a validation function that throws on missing required vars. Call it from the root layout or a middleware-level check.

### 5. Soft-delete purge cron not implemented
**Issue:** CLAUDE.md documents a 7-day expiry for soft-deleted contacts, but no purge job exists. Deleted contacts accumulate forever, and users can recover contacts indefinitely (violating the stated 7-day policy).  
**Fix:** Create `/api/cron/purge` route that hard-deletes contacts where `deleted_at < now() - interval '7 days'`. Add to `vercel.json` cron schedule.

---

## High Priority (fix before launch)

### 6. No auth rate-limit handling (Supabase 429)
**Files:** `src/app/auth/page.tsx`, `src/app/auth/forgot-password/page.tsx`  
Supabase free tier throttles auth emails to 3–4/hour. When users hit the limit, they see Supabase's raw error message instead of a friendly one. Add error handling to detect 429 responses and show "Too many requests. Please try again in a few minutes."

### 7. Contact form has no rate limiting
**File:** `src/app/api/contact/route.ts`  
Public POST endpoint with no rate limiting. A comment on line 34 acknowledges this: "in production, add IP-based limiting." Without it, attackers can spam-flood `hello@daysight.xyz`. Implement IP-based rate limiting (e.g., Upstash Redis) or at minimum catch Resend rate-limit errors.

### 8. Affiliate webhook input validation is loose
**File:** `src/app/api/webhooks/affiliate/route.ts` line 38  
Accepts any `partner` string and `commission` number without validation. Negative commissions, unrealistic values, or garbage partner names corrupt analytics. Validate `commission >= 0 && commission <= reasonable_max` and validate `partner` against known affiliates.

### 9. Re-engagement drip has JSONB race condition
**File:** `src/app/api/cron/reengagement/route.ts` lines 69, 102–106  
Fetches `drips_sent` JSONB, mutates it in JS, then writes back. Two concurrent cron runs can overwrite each other's changes. Use Postgres JSONB operators (`drips_sent || jsonb_build_object(...)`) for atomic updates.

### 10. Digest and re-engagement routes have no dedup for concurrent runs
Unlike the reminders route (which pre-inserts `pending` rows), digest and re-engagement routes have no mechanism to prevent duplicate sends if cron fires twice. Add a `last_digest_sent_at` / `last_drip_sent_at` column to profiles and check before sending.

### 11. Gift engine returns empty array silently when catalog is empty
**File:** `src/lib/gift-engine.ts` lines 203–210  
If all gifts are inactive, `selectGiftsScored()` returns an empty array. The email template handles this (no "Gift Ideas" header), but the silent degradation hides data issues. Log a warning when the fallback path is hit; consider requiring at least one active gift.

### 12. Timezone is fetched but never used in reminder cron
**File:** `src/app/api/cron/reminders/route.ts` line 57  
Fetches `timezone` from profile but ignores it — all sends happen at UTC cron time. `preferred_send_hour` is also unused. Either implement timezone-aware sending or document this as a known limitation and remove the unused field from the query.

### 13. Email header injection in contact form
**File:** `src/app/api/contact/route.ts` line 44  
User-supplied `senderName` is interpolated directly into the email subject. While Resend's SDK likely escapes this, strip newlines and control characters as defense-in-depth: `senderName.replace(/[\r\n\x00-\x1f]/g, ' ')`.

---

## Medium Priority (should fix, not blocking)

### 14. Missing `shown_gifts(user_id, gift_id)` index
Gift repeat-penalty lookups scan the `shown_gifts` table without an index on `(user_id, gift_id)`. Will degrade as users accumulate history.

### 15. Admin panel silent failures
Queue page `saveMessage()`/`deleteMessage()` and gifts page `saveGift()`/`toggleActive()` have no error handling for Supabase failures. Users get no feedback on failed operations.

### 16. Settings account deletion has no error handling
`handleDeleteAccount()` has no try/catch. A partial failure leaves data in an inconsistent state with no user notification.

### 17. Gift catalog URL validation missing
Admin gift form accepts any string for `affiliate_url`. Malformed URLs will break email links for all users who receive that gift. Validate with `new URL()` before insert.

### 18. Onboarding save has no error feedback
`handleSaveAndFinish()` silently advances to step 4 even if the contact/event insert fails. Catch Supabase errors and keep the user on step 3 with an error message.

### 19. Recycling bin permanent delete has no confirmation
Single click on "Delete forever" permanently removes a contact with no confirmation dialog.

### 20. ESLint version skew
`eslint-config-next@14.2.29` (dev) vs `next@14.2.30` (prod). Should match.

---

## Low Priority / Nice-to-Have

### Accessibility gaps
- Emoji icons in sidebar lack `aria-hidden="true"` + proper `aria-label` on links
- No visible `:focus-visible` indicators for keyboard navigation
- Modal dialogs missing `role="dialog"` and `aria-labelledby`
- Form labels not always linked to inputs via `htmlFor`

### Mobile nav missing on marketing pages
Marketing nav/footer don't have a mobile hamburger menu. Desktop-only layout.

### No automated tests
No unit tests for critical date math (`nextOccurrence`, `matchReminderWindow`, `scoreGift`), timezone edge cases (Feb 29, Dec 31 → Jan 1 rollover), or auth flows. CLAUDE.md acknowledges this as Phase 9 scope.

### Reminder window doesn't cover same-day events
`matchReminderWindow()` has no window for `daysUntil === 0`. Events happening today get no reminder. May be intentional but isn't documented.

---

## What's in Good Shape

- Auth middleware is solid — correct route protection, no bypasses found
- RLS policies configured on all Supabase tables
- Admin access properly gated server-side via `profiles.is_admin`
- Email verification correctly gates all reminder/digest sends
- Pre-send pending logging + idempotency keys prevent duplicate reminder emails
- Range-based window matching self-heals up to 2-day outages
- Per-user send cap (3/day) prevents post-outage floods
- Gift scoring engine is well-designed — deterministic, zero per-query cost
- No debug code, console.logs, or hardcoded secrets found
- `/api/test-email` route has already been removed
- TypeScript strict mode catching type errors at build time

---

## Recommended Fix Order

1. **Digest column name bug** (#1) — runtime crash, 2-minute fix
2. **Webhook secret enforcement** (#2) — security hole, 15-minute fix
3. **Sender address consistency** (#3) — deliverability, 5-minute fix
4. **Env var validation** (#4) — reliability, 30-minute fix
5. **Auth 429 handling** (#6) — user-facing, 30-minute fix
6. **Soft-delete purge cron** (#5) — data integrity, 1-hour fix
7. **Contact form rate limiting** (#7) — abuse prevention, 1–2 hours
8. **JSONB race condition** (#9) — data integrity, 30-minute fix
9. **Admin error handling** (#15, #16, #17, #18) — UX, 2–3 hours
10. **Automated tests** — risk reduction, 4–6 hours

Total estimated effort for blockers + high priority: ~8–12 hours of focused work.
