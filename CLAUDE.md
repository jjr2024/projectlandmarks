# CLAUDE.md — Daysight (codename: Landmarks)

> **Naming:** External brand = **Daysight**. "Landmarks" = internal codename (folder names, docx filenames). User-facing text must say "Daysight." Domain: `daysight.xyz`.

## Project Status

**Production-ready.** Next.js + Supabase + Resend + Vercel, live and auto-deploying. Phases 1–9 complete. UI conformity sweep done (input styling, icon consistency, onboarding parity).

Legacy prototype HTML files in repo root are read-only reference. All development targets `src/`.

## What Daysight Is

Email-first birthday/gift reminder service. Users enter contacts and dates, pick gift preferences, and get reminder emails with affiliate gift links. Free to user; revenue from affiliate commissions.

## Quick Start

```bash
npm install
# Create .env.local (see Environment Variables)
npm run dev          # http://localhost:3000
npm run build        # always run before push — catches TS errors Vercel will reject
```

## Tech Stack

- **Next.js 14** — App Router, API routes, middleware, on Vercel
- **Supabase** — Postgres + Auth + RLS
- **Resend** — transactional email via React Email templates
- **Cron triggers** — two independent sources call `/api/cron/reminders` every hour, both authenticated with the same `CRON_SECRET` bearer token:
  - **cron-job.org** — hourly at minute `:37` UTC, hits `/api/cron/reminders` only. In practice this is the more reliable of the two triggers — fires on time, every time — and accounts for the bulk of real reminder cron invocations.
  - **GitHub Actions** (`.github/workflows/cron.yml`) — hourly at minute `:07` UTC for reminders, plus the only trigger for digest (1st–2nd of month), re-engagement (daily 13:00 UTC), and purge (daily 04:00 UTC). Frequently delayed 2–15 minutes by GitHub's scheduler congestion; occasionally drops a tick entirely. Requires GitHub repo secrets `CRON_SECRET` and `SITE_URL`.
  - **Why two**: GitHub Actions alone is not reliable enough for hourly reminders given send-hour gating. cron-job.org provides the dependable hourly hit; GitHub Actions remains the trigger of record for the three non-hourly crons (digest/re-engagement/purge) which cron-job.org doesn't call. Double-firing the reminder route within the same hour is safe — the route is idempotent (partial unique index on `reminder_log` blocks duplicates, Resend idempotency keys back-stop at the email provider, send-hour gating short-circuits users outside their hour). Vercel Cron (`vercel.json`) is an empty no-op kept only because removing the file caused Hobby deploy issues earlier in the project's history.
- **TypeScript** strict mode, `@/*` → `./src/*`
- **Tailwind CSS** via PostCSS

## Environment Variables

Required in `.env.local` and Vercel:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (`sb_secret_...`) — bypasses RLS |
| `RESEND_API_KEY` | Resend API key |
| `CRON_SECRET` | Bearer token for cron routes |
| `RESEND_WEBHOOK_SECRET` | Resend webhook verification |
| `AFFILIATE_WEBHOOK_SECRET` | Affiliate postback auth |

Validated at startup via `src/lib/env.ts`.

## File Map

```
src/
├── app/
│   ├── (admin)/admin/         Admin (is_admin gated): dashboard, queue, gifts, error boundary
│   ├── (app)/                 Auth'd pages (shared sidebar): dashboard, contacts, contacts/[id], settings, error boundary
│   ├── (onboarding)/          Isolated layout: onboarding
│   ├── about|privacy|terms|contact|consent|unsubscribe/  Public pages (contact = static email page, no form)
│   ├── auth/                  Sign in/up (with ← Home link), callback, forgot-password, reset-password
│   └── api/
│       ├── cron/              reminders, digest, reengagement, purge
│       ├── webhooks/          resend, affiliate
│       ├── calendar/[userId]  .ics feed (HMAC-signed, RFC 5545 line folding)
│       ├── calendar-url/      Signed calendar URL
│       └── unsubscribe/       HMAC-verified unsubscribe
├── components/                sidebar, admin-sidebar, marketing-nav, marketing-footer, email-verification-banner, email-unsubscribed-banner, gift-icons
├── emails/                    reminder, digest, reengagement (React Email templates)
├── lib/
│   ├── supabase/              admin.ts (service_role), client.ts (browser), server.ts (SSR cookies)
│   ├── email-config.ts        From/replyTo, REMINDER_DAY_OPTIONS, REMINDER_TOLERANCE, SEND_HOUR_OPTIONS, MAX_RETRY_ATTEMPTS, FAILED_RETRY_INTERVAL_MS, defaults
│   ├── env.ts                 Server env validation
│   ├── gift-engine.ts         Weighted scoring: scoreGift() + selectGiftsScored()
│   ├── reminders.ts           Timezone-aware date math, per-user window matching, send-hour gating, idempotency, send caps
│   ├── resend.ts              Resend client
│   ├── tokens.ts              HMAC token gen/verify (unsubscribe, calendar)
│   ├── utils.ts               compareTokens (timing-safe), misc
│   ├── errors.ts              friendlyError() — sanitizes Supabase errors for UI
│   └── constants.ts           GIFT_CATEGORIES, GIFT_OPTIONS (single source for UI category labels)
├── __tests__/reminders.test.ts  142 unit tests
└── middleware.ts              Auth guard for /dashboard, /contacts, /settings, /onboarding, /admin, /consent
supabase/migrations/
├── 001 Core tables    002 drips_sent JSONB    003 email resilience    004 gift catalog seed
├── 005 email_overrides    006 atomic drips_sent RPC    007 consent columns    008 delete_user_account RPC
├── 009 event soft delete    010 RLS deny writes    011 fix email cap index    012 anonymize conversion_events
├── 013 add pronoun→gender    014 rename pronoun to gender (Male/Female/Other/N/A)
├── 015 add has_pets boolean    016 remap gift categories, reseed catalog, add gender_tags, update defaults
├── 017 seed 5 new gift catalog items (XLS v3.0)
├── 018 populate image_url with self-hosted paths
├── 019 add last_digest_sent to profiles
├── 020 fix reminder_log dedup index (partial, live statuses only) + add 'expired' to status CHECK
├── 021 'bounced' is terminal at dedup (adds bounced to partial-index predicate + dedup cleanup)
├── 022 admin/debug instrumentation: add updated_at to contacts+events (backfilled from created_at), add last_changed_fields text[] to profiles+contacts+events, swap their triggers to set_updated_at_and_changed_fields() (generic JSONB diff). email_overrides stays on the original set_updated_at()
├── 023 add ds_sku (Daysight internal SKU) to gift_catalog with unique + format constraint, backfilled deterministically from name via slug. Wire gift_catalog to set_updated_at_and_changed_fields() trigger. Create gift_catalog_audit (append-only log keyed by run_id) for tracking sync runs. Catalog edits move from migrations to scripts/sync-gift-catalog.mjs from this point forward.
├── 024 add_contact_and_event_limits: BEFORE INSERT triggers enforce_contact_limit() (≤100 live contacts/user) and enforce_event_limit() (≤10 live events/contact). Authoritative DB backstop for the client-side UX gates. Only counts deleted_at IS NULL rows; INSERT-only so lowering a limit never breaks existing over-cap users. Raises P0001 with "contact/event limit reached" message (mapped by friendlyError()). See Architecture § "Account limits".
scripts/
├── sync-gift-catalog.mjs       Canonical workflow for editing gift_catalog. Reads XLS → diffs against DB by ds_sku → INSERT/UPDATE/soft-deactivate with audit logging. See "Gift catalog workflow" below.
├── download-gift-images.mjs    Downloads/resizes product images to public/gifts/{slug}.jpg. Slug truncated at 60 chars; sync-gift-catalog.mjs mirrors that truncation when writing image_url.
.github/workflows/
└── cron.yml               GitHub Actions trigger. Reminders hourly at :07 UTC, digest 1st–2nd of month 14:07 UTC, re-engagement daily 13:07 UTC, purge daily 04:07 UTC. cron-job.org separately hits /api/cron/reminders hourly at :37 UTC (configured outside the repo; see Tech Stack)
```

## Architecture

**Data:** Supabase Postgres + RLS. Admin client (`lib/supabase/admin.ts`) uses service_role to bypass RLS for cron jobs.

**Soft-delete:** `deleted_at` on contacts and events. Purge cron hard-deletes after 7 days (cascades to events, reminder_log, shown_gifts). **One-time events:** The reminder cron skips one-time events whose date has passed (`event.one_time && event.event_year && oneTimeDate < now`). One-time events with `event_year: null` (legacy) are treated as recurring to avoid silently dropping reminders.

**Account limits:** `MAX_CONTACTS_PER_USER = 100` and `MAX_EVENTS_PER_CONTACT = 10` (`lib/constants.ts`). **Two-layer enforcement:**
- **DB triggers (authoritative — migration 024):** `BEFORE INSERT` triggers `enforce_contact_limit()` / `enforce_event_limit()` raise P0001 ("contact/event limit reached") when at the cap. This is the real backstop — inserts go through the browser anon key, so client gating alone is bypassable via direct API calls. `friendlyError()` maps the P0001 message to "You've reached the maximum of N…" (`lib/errors.ts`).
- **Client UX gates (convenience):** The contacts list and contact detail pages hide the cap until the user is within `CONTACT_LIMIT_WARN_WITHIN = 5` (contacts) / `EVENT_LIMIT_WARN_WITHIN = 2` (events). Inside that band a "You're using X of N" hint appears; at the cap the add button is disabled and `openAdd()` early-returns.
- **Trash doesn't count:** Both the trigger counts and the UI counts filter `deleted_at IS NULL`, so soft-deleted items in the 7-day trash window do **not** consume quota. Keep the trigger thresholds in sync with `constants.ts`.
- **Triggers are INSERT-only:** existing rows over a limit are never touched, so lowering a cap later only blocks new inserts — it won't break current users.
- **Accepted concurrency gap:** the trigger's count-then-insert is not atomic, so two simultaneous inserts at the boundary can both succeed (off-by-one over the cap). Intentionally unguarded — acceptable for a soft abuse cap; a heavier lock is not warranted.

**Route groups:** `(app)` = auth'd sidebar layout. `(onboarding)` = isolated layout. `(admin)` = admin sidebar, gated on `profiles.is_admin`.

**Onboarding:** 4-step flow (Welcome → Contact+Events → Gift prefs → Done). Always starts at step 1 — **URL-based step initialization (`?step=`) was intentionally removed** because it allowed users to jump to step 3/4 with blank form state, causing garbage contact inserts or RLS errors. Do not re-add it; the flow is short enough that starting from step 1 is fine. Page shows a loading spinner until profile fetch resolves (prevents "Welcome, !" flash). `savedRef` prevents double-submission if the user navigates Back from step 4. Error messages use `friendlyError()`. Collects full contact fields including notes. Events include "Other options" expandable (year_started, one_time, event_year) — collapsed by default to keep the happy path clean. If `one_time` is checked, `event_year` becomes required (red border + inline error if empty, blocks save). Checking `one_time` auto-populates `event_year` with the current year and keeps the collapsible expanded. Unchecking clears `event_year`. The contact detail event modal (`contacts/[id]`) has the same validation. Icons use inline SVGs (no emojis). "Skip gifts" is a toggle button, not a checkbox.

**Public pages:** Contact page is a simple static page with a mailto link to info@daysight.xyz (no form, no API route). Privacy policy has no disclaimer banner. Terms and privacy both reference email-only contact.

**Middleware:** Supabase SSR cookies. Protects app routes → redirects unauth'd to `/auth`. Redirects auth'd away from `/auth` (except reset-password).

**Auth:** Supabase Auth with PKCE flow (`@supabase/ssr` default). Email verification required — no emails sent to unverified addresses (GDPR/CAN-SPAM: emails contain affiliate links). Password changes use `reauthenticate()` (nonce-based, no duplicate session). Post-signup success screen and in-app `EmailVerificationBanner` both offer resend-verification with 60-second cooldown (persisted to `sessionStorage`). **PKCE caveat:** `supabase.auth.resend()` does NOT regenerate the PKCE `code_verifier`/`code_challenge` pair, so re-sent verification links fail at `exchangeCodeForSession()`. Three mitigations: (1) the post-signup screen prefers `signUp()` when the password is still in component state, which generates a fresh PKCE pair; (2) if the password is gone (user refreshed/reopened the tab), the post-signup screen falls back to `resend()` — the link's code exchange may fail, but the auth callback's session-based fallback handles this gracefully; (3) the in-app banner uses `resend()` (no password available), and the same callback fallback applies — if code exchange fails and the user already has an active session, it redirects to `/dashboard` instead of showing an error (email is verified server-side by Supabase before the redirect regardless of PKCE outcome).

**Consent gating:** Two mandatory signup checkboxes (Terms+Privacy, affiliate emails). Stored in `profiles` via `handle_new_user()` trigger. Both `(app)/layout.tsx` and `(onboarding)/layout.tsx` check `consent_terms` — users without terms acceptance are redirected to `/consent`. The consent page uses `.update().select()` to detect zero-row updates (missing profile row — trigger failed at signup). If no rows are updated, it self-heals via upsert, recovering `display_name` from `auth.users.raw_user_meta_data`. This prevents an infinite redirect loop between `/consent` and `/dashboard`. `consent_emails` is handled separately: unsubscribed users (terms=true, emails=false) stay in the app but see a persistent `EmailUnsubscribedBanner` directing them to Settings to re-enable. The Settings page has a re-subscribe block that sets `consent_emails` back to true. Cron routes independently gate on both `consent_terms` and `consent_emails`. Additionally, the reminder cron gates on `email_reminders_enabled` (separate from consent — this is a user preference toggle in Settings). Disabling event reminders triggers a `window.confirm()` warning explaining it stops all birthday/event reminder emails. When disabled, a red inline warning appears below the checkbox. The digest cron uses its own `monthly_digest_enabled` toggle independently.

**Security:**
- Timing-safe token comparison (`compareTokens()`) on all cron/webhook auth
- Open redirect protection on auth callback
- Bearer-only webhook auth (no svix-id fallback)
- HMAC-signed unsubscribe + calendar URLs (no raw UUIDs)
- Affiliate webhook validates user_id ownership against reminder_log
- Generic forgot-password response (prevents email enumeration)
- Atomic account deletion via `POST /api/delete-account` — runs `delete_user_account()` RPC (app data) then `auth.admin.deleteUser()` (auth record). **Both steps are required** — the RPC alone leaves `auth.users` intact, allowing re-login with the same credentials. The API route uses the service-role admin client; the settings page calls it via fetch.
- All client-side update/delete queries include `.eq("user_id", userId)` alongside RLS
- `friendlyError()` sanitizes all Supabase errors shown to users
- Exact string matching on gift tags (no substring)

**Email system:** Supabase Auth emails (verification, password reset) are sent via Resend's SMTP relay — configured in Supabase Dashboard → Authentication → SMTP Settings with Resend credentials. This removes the built-in mailer's 3–4/hour rate limit. Transactional app emails (reminders, digest, re-engagement) use Resend's API directly. Three cron routes via Resend + React Email. The reminder cron runs **hourly** (`0 * * * *`). Each run only processes users whose current local hour (derived from `profiles.timezone` via `Intl.DateTimeFormat`) matches their `preferred_send_hour` (hourly options: 6am–9pm, i.e. 6–21 — stored in `profiles`, default 8). This ensures emails arrive at the user's chosen time regardless of timezone. **Day math is timezone-aware:** `calendarDaysUntil()` computes pure calendar days in the user's local timezone (May 25 → May 27 = 2, regardless of hour or UTC offset). No `Math.ceil`, no fractional days. Reminders respect the user's `reminder_days_before` preference (selectable: 1, 3, 7, 14, 21 days — stored in `profiles`, default `{7, 3}`). The cron passes the user's timezone to `calendarDaysUntil()`, then `matchReminderWindow()` checks against late-side-only tolerance windows (see Email Resilience). Events with `high_importance` always inject a 21-day reminder even if the user hasn't selected it. Email subject/body show **actual calendar days**, not the canonical window — e.g., "2 days" if the late-tolerance caught a 3-day reminder. When actual days !== canonical days, a small late-send note appears above the footer. After matching, the cron selects gifts, sends, and logs to `reminder_log` + `shown_gifts`. Digest = next-30-days lookahead (not calendar-month scoped); body copy says "in the next 30 days," subject uses current month name. Digest dedup via `profiles.last_digest_sent` — skips if already sent this calendar month. Resend idempotency key `ds-digest-{userId}-{YYYY}-{MM}` as belt-and-suspenders. GitHub Actions fires the digest on every hourly run during the 1st–2nd of the month (~48 chances), so a few missed runs can't skip the digest. Re-engagement = D+3/D+10/D+30 drip for zero-contact users (tracked in `profiles.drips_sent` JSONB, not `reminder_log`). All cron routes paginate `listUsers()` (1000/page loop) to handle >1000 users.

**Calendar feed:** `.ics` via `/api/calendar/[userId]`. One-time events use stored `event_year` with no `RRULE`; recurring events get `RRULE:FREQ=YEARLY`. Lines folded per RFC 5545 §3.1 (75-octet limit).

**Gift engine (`lib/gift-engine.ts`):** Deterministic weighted scoring. Weights: category (+40), budget tier (+20), gender match (+20) / gender mismatch (−10), relationship affinity (+15), event affinity (+15), tag overlap (+3/tag), last-minute bonus/penalty (±10–20), repeat penalty (−25/prior showing), PET_BONUS (+30 when contact.has_pets and gift category is "pet"), seeded shuffle (0–9). Returns top 3. No LLM. Fallback default categories: `["flowers", "home"]`. "pet" is engine-only (not user-selectable) — dynamically injected into query when `contact.has_pets` is true. Gender scoring uses `gender_tags` on `gift_catalog` (values: "woman", "man", "unisex", or empty for neutral). Contacts with gender "Other", "N/A", or null skip gender scoring entirely. `mapGenderToTag()` maps contact gender → gift tag. `relationship_affinities` and `event_affinities` support `"all"` as a wildcard — the scoring code checks `.includes("all")` as a universal match. When catalog values are populated with specific entries (e.g., `["family", "friend"]`), exact matching applies. Last-minute broadening uses two parallel queries (category match + is_last_minute=true) then deduplicates — do NOT use PostgREST `.or()` with `.in()` (quoting issues).

**Admin panel:** Analytics dashboard (KPIs, conversion funnel, breakdowns from `conversion_events`), email queue (per-slot custom message editor via `email_overrides`), gift catalog (read-only). Custom messages rendered as "A note from Daysight" in reminder emails. Dashboard user count fetched via `/api/admin/stats` (service-role client, bypasses RLS). Sent KPI counts all successful statuses (`sent`/`delivered`/`opened`/`clicked`), not just `sent`. Queue uses `calendarDaysUntil()` for timezone-aware day math (same as cron) and fetches per-user `reminder_days_before` to build accurate reminder windows. Gift catalog page is read-only — the master XLS is the single editable source of truth; DB is seeded from XLS.

**Webhooks:** `/api/webhooks/resend` → updates `reminder_log.status` + inserts to `conversion_events`. `/api/webhooks/affiliate` → inserts purchased event with commission.

## Email Resilience

Core logic in `src/lib/reminders.ts` (helpers) and `src/app/api/cron/reminders/route.ts` (two-pass architecture). Six mechanisms:

1. **Pre-send logging:** Insert `reminder_log` with `status='pending'` before Resend call. Update to sent/failed/deferred after. **Partial** unique index on `(user_id, event_id, days_before, event_date) WHERE status IN ('pending','sent','delivered','opened','clicked','bounced')` guards against race conditions (catch Postgres 23505 = already handled). Abandoned/retry-eligible rows (`expired`, `failed`, `deferred`) are excluded from the index so retries can INSERT a fresh `pending` row for the same tuple — see migration 020 for the bug that motivated this. `bounced` is included as terminal: a hard bounce should permanently block further send attempts to the same address for this reminder cycle (migration 021). Predicate must stay in sync with the dedup query in `reminders/route.ts`.
2. **Idempotency keys:** `ds-{userId}-{eventId}-{canonicalDays}-{date}` header on every Resend call.
3. **Range-based windows:** Per-user selectable reminder days (1, 3, 7, 14, 21) with late-side-only tolerance for cron outage recovery. Windows never fire early — only extend backward: 21→[19–21], 14→[12–14], 7→[5–7], 3→[2–3], 1→[0–1]. `high_importance` events inject day 21 regardless of user preference. Falls back to `DEFAULT_REMINDER_DAYS` [7, 3] if user preference is null/empty. Config in `REMINDER_DAY_OPTIONS` and `REMINDER_TOLERANCE` (`email-config.ts`); matching in `matchReminderWindow(daysUntil, highImportance, userDays)` (`reminders.ts`).
4. **Per-user send cap:** Max 3 emails/user/day. Checked before and during event loop. Excess deferred to next run.
5. **429 handling:** On rate limit, mark deferred, break user loop immediately. Retry on next cron run.

6. **Two-pass recovery architecture.** Every hourly cron run executes Pass 1 (the normal send-hour-gated loop) and then Pass 2, which has two phases that run regardless of send hour:

   - **Pass 2a — stale pending recovery.** Scans for `pending` rows older than 5 minutes (function killed mid-Resend, missed cron, etc.). Transitions them to `expired` and calls the shared `attemptRetry()` helper.

   - **Pass 2b — hourly retry of failed/deferred.** Scans for `failed` and `deferred` rows older than `FAILED_RETRY_INTERVAL_MS` (default 2h) within a 24h lookback window. Dedupes by `(user_id, event_id, days_before, event_date)` tuple in memory (DESC by `created_at`, first-write-wins → most recent attempt per tuple drives the cooldown). For each tuple, a live-row pre-check guards against concurrent runs, then `attemptRetry()` is called. `bounced` rows are **never** retried — bounces indicate permanent delivery failure (bad address, suppression list, mailbox full).

   The shared `attemptRetry()` helper enforces the retry cap (default `MAX_RETRY_ATTEMPTS = 5` counting `failed` + `expired` + `deferred` for the same tuple), short-circuits on past `event_date`, refetches user/profile/event/consent (so settings changes between the original send and the retry are honored), re-selects gifts, inserts a fresh `pending` row, calls Resend with an idempotency key suffixed `-retry-{timestamp}`, and transitions the row to `sent`/`failed`/`deferred` based on the outcome. On 429 it sets `results.rateLimited = true` so both Pass 2 phases break out.

   With defaults (cap 5, interval 2h), a single reminder survives ~10 hours of Resend outage before the cap is hit. To survive a 24h outage, raise `MAX_RETRY_ATTEMPTS` to 12 in `email-config.ts`.

   **Schema invariant (migration 020):** `'expired'` is included in the status CHECK constraint and the dedup unique index is partial — `WHERE status IN ('pending','sent','delivered','opened','clicked')`. Before migration 020 both were broken: `'expired'` violated the CHECK constraint and the silent UPDATE failure left rows stuck at `'pending'`, while the non-partial index would have blocked retry INSERTs anyway. The two `update({status:"expired"})` calls in `reminders/route.ts` now inspect their error result so any future drift surfaces in `results.errors` instead of silently bricking reminders.

**Not covered:** Re-engagement lacks pre-send dedup (acceptable — `drips_sent` JSONB prevents duplicates at the application level, and `>=` day comparison means missed days auto-recover). Resend outages longer than `MAX_RETRY_ATTEMPTS × FAILED_RETRY_INTERVAL_MS` (default 10h) at the start of a reminder window can permanently miss that reminder — the cap is intentionally finite. The 1-day window has only 1-day tolerance (range [0–1]) so a 2-day outage misses it. Hard bounces are terminal by design.

## Supabase Schema

| Table | Key columns |
|---|---|
| `profiles` | display_name, timezone, preferred_send_hour, reminder_days_before, drips_sent, consent_terms, consent_emails, email_reminders_enabled, monthly_digest_enabled, last_digest_sent, **updated_at, last_changed_fields** |
| `contacts` | first_name, last_name, relationship, gender, gift_categories, budget_tier, has_pets, deleted_at, **updated_at, last_changed_fields** |
| `events` | event_type, month, day, high_importance, suppress_gifts, one_time, event_year, contact_id FK, user_id, deleted_at, **updated_at, last_changed_fields** |
| `reminder_log` | user_id, event_id, contact_id, days_before, event_date, resend_id, status, gift_ids |
| `shown_gifts` | contact_id, gift_id, year |
| `gift_catalog` | **ds_sku (unique stable identifier)**, name, category, partner, price_tier, description, tags, gender_tags, affiliate_url, image_url, is_active, is_last_minute, **updated_at, last_changed_fields** |
| `gift_catalog_audit` | run_id, run_at, run_by, gift_id FK, gift_ds_sku, action (insert/update/deactivate/reactivate), changed_fields, old_values JSONB, new_values JSONB, note |
| `email_overrides` | user_id, event_id, days_before, event_year, custom_message (unique composite) |
| `conversion_events` | reminder_id, user_id, event_type, partner, gift_category, commission |

**Never append to executed migration files** — Supabase won't re-run them. Use SQL editor for ad-hoc changes.

## API Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/cron/reminders` | GET | `Bearer CRON_SECRET` | Hourly — send reminders (per-user send hour + day prefs, timezone-aware) |
| `/api/cron/digest` | GET | `Bearer CRON_SECRET` | 1st of month 14:00 UTC — monthly digest |
| `/api/cron/reengagement` | GET | `Bearer CRON_SECRET` | Daily 13:00 UTC — D+3/D+10/D+30 drip |
| `/api/cron/purge` | GET | `Bearer CRON_SECRET` | Daily 04:00 UTC — hard-delete expired trash |
| `/api/webhooks/resend` | POST | `Bearer RESEND_WEBHOOK_SECRET` | Delivery events → reminder_log + conversion_events |
| `/api/webhooks/affiliate` | POST | `Bearer AFFILIATE_WEBHOOK_SECRET` | Purchase postbacks → conversion_events |
| `/api/calendar/[userId]` | GET | HMAC token | .ics feed |
| `/api/calendar-url` | GET | Session cookie | Signed calendar URL |
| `/api/admin/stats` | GET | Session cookie + is_admin | User counts (service-role, bypasses RLS) |
| `/api/delete-account` | POST | Session cookie | RPC cascade + auth.admin.deleteUser() |
| `/api/unsubscribe` | POST | HMAC uid+token | Set consent_emails=false |
| `/auth/callback` | GET | — | OAuth/magic-link/verification → session (PKCE fallback: redirects to app if exchange fails but session exists) |

## Key Files (Read First)

1. This file
2. `src/app/api/cron/reminders/route.ts` — core business logic
3. `src/emails/reminder.tsx` — what users receive
4. `src/lib/email-config.ts` — email config, REMINDER_DAY_OPTIONS, SEND_HOUR_OPTIONS, tolerance windows
5. `src/middleware.ts` — auth routing
6. `supabase/migrations/001_initial_schema.sql` — data model

## Conventions

- Dates stored as month (1–12) + day (1–31), not Date objects
- Emails from `noreply@daysight.xyz`, replyTo `support@daysight.xyz`
- Brand color: `brand-600` = `#d05a32` (orange-warm)
- Urgency: 0–3 days = red, 4–7 = orange, 8+ = green
- Auth errors: always generic "Invalid email or password" on sign-in (no email enumeration). Duplicate email detected via empty `identities` array.
- Domain: `daysight.xyz`
- Gift categories (12 user-selectable): flowers, wine, food_snacks, home, books, electronics, sports, apparel, beauty, jewelry, wellness, games_toys. Plus `pet` (engine-only, not user-selectable — triggered by `has_pets` toggle on contacts). Category values and UI labels defined once in `lib/constants.ts` (`GIFT_CATEGORIES` + `GIFT_OPTIONS`) — all UI surfaces import from there
- Gender tags on gifts: `"woman"`, `"man"`, `"unisex"`, or empty (gender-neutral). Stored in `gift_catalog.gender_tags` text[]. Admin UI exposes a multi-select. Contacts with gender Other/N/A/null skip gender scoring.

## Known Limitations

- No Google OAuth (disabled with "coming soon" in prototype)
- Affiliate links use clean `/dp/ASIN?tag=` format for Amazon; UrbanStems/Wine.com use original URLs
- Gift catalog XLS v3.0 (72 items) has `clean_affiliate_url` column (use this for DB seeding, not `affiliate_url`). XLS also contains internal-reference columns not used by the webapp: `is_active`, `asin`, `current_price`, `star_rating`, `review_count`, `last_updated`, `affiliate`. XLS `image_url` is the Amazon CDN source URL (used by the download script only — never hotlinked in emails). DB `image_url` stores self-hosted paths (`https://daysight.xyz/gifts/{slug}.jpg`). XLS descriptions are the source of truth for product copy.
- `relationship_affinities` and `event_affinities` default to `["all"]` in catalog — `"all"` is treated as a universal wildcard (+15 each always awarded). When specific values are populated, exact matching applies
- `is_last_minute` is over-tagged (97% = yes) — needs audit to flag only truly instant-delivery items
- No contact import (CSV, Google Contacts, vCard)
- Privacy Policy and Terms have mismatched retention timelines
- GDPR legal basis vague — should map processing activities to specific bases
- Re-engagement cron lacks pre-send dedup (acceptable — `drips_sent` JSONB prevents duplicates at application level, and `>=` day comparison auto-recovers missed days)
- Remaining from prototype: data export
- Affiliate webhook accepts unverified user_id-only postbacks (trade-off T-1 — pending owner decision on HMAC/stricter validation)
- Resend spam complaints mapped to "bounced" status instead of triggering auto-unsubscribe (trade-off T-2 — pending owner decision)
- `shown_gifts` insert errors silently swallowed in reminder cron (acceptable — doesn't block email delivery)
- **Dedup blocks retries on stuck "pending" rows (FIXED in migration 020):** The reminder cron's dedup query only blocks on `sent`/`delivered`/`opened`/`clicked`. Stale "pending" rows (>5 min old) are marked `"expired"` and retried. A two-pass architecture retries across all users regardless of send hour. Retry cap of 3 `failed`+`expired` attempts prevents infinite retries. The earlier code-only fix was *latent*: (1) `'expired'` was not in the status CHECK constraint from migration 003, so the `UPDATE ... SET status='expired'` silently failed with 23514 and the row stayed `pending`; and (2) even if it had transitioned, the non-partial unique index from migration 001 still occupied the dedup slot, so the follow-up INSERT hit 23505 (silently caught in the cron). Migration 020 fixes both: adds `'expired'` to the CHECK constraint and makes the dedup index partial (`WHERE status IN ('pending','sent','delivered','opened','clicked')`). The two `update({status:"expired"})` call sites now also inspect their error result. See Email Resilience § "Stale pending recovery" and migration 020's header for the full diagnosis.
- **Vercel Hobby cron limitation (resolved):** Vercel Hobby only runs crons once per day at an unpredictable hour, which broke send-hour gating. Fixed by moving all cron triggers to GitHub Actions. `vercel.json` crons have been removed entirely — they were also causing Hobby plan deploy failures when >2 crons were defined.
- **Vercel production env vars:** `RESEND_WEBHOOK_SECRET` has been configured locally (`.env.local`) and the Resend webhook endpoint is set up in the Resend dashboard pointing to `https://daysight.xyz/api/webhooks/resend`. Verify the Vercel env var matches. `AFFILIATE_WEBHOOK_SECRET` is still a placeholder in Vercel production. `APP_URL` must be set to `https://daysight.xyz` in Vercel env vars (not just `.env.local`). **Critical:** all env vars listed in `src/lib/env.ts` must be set in Vercel — if any are missing or placeholder, the cron route will fail mid-execution after inserting a "pending" row (see Debugging History).

## Gotchas

- `npm run build` before push — Vercel strict mode catches errors `next dev` misses. However, full builds typically time out in constrained environments (e.g. Cowork). Use `npx tsc --noEmit` for fast type-checking during AI-assisted sessions; reserve full `npm run build` for local terminal sessions.
- `useSearchParams()` needs `<Suspense>` boundary in Next.js 14 production builds
- Use individual `@react-email/*` packages, not the unified `react-email` (heavy CLI)
- `Precedence: bulk` header removed — was causing Gmail Promotions classification
- Emails: pixels only (no rem/em/%), stacked layout for gift cards (product image + title/description/price/CTA). Images rendered at 200px with 8px border-radius for soft corners; source files are 400px (retina 2×). CTA buttons use `display: "block"` + `width: "100%"` for mobile tap targets; secondary buttons use `inline-block`
- Email images must be self-hosted at absolute HTTPS URLs on `daysight.xyz`. Amazon CDN URLs cannot be hotlinked in emails (blocked by Amazon in non-browser contexts); UrbanStems/Wine.com URLs expire. All product images live in `public/gifts/{slug}.jpg` → `https://daysight.xyz/gifts/...` via Vercel CDN. Gmail strips `data:` URIs entirely. Logo lives at `public/email/logo-daysight.png` → `https://daysight.xyz/email/logo-daysight.png`. Header wordmark uses an explicit inline `<span style="color:#ffffff">` — raw `<td>` color is stripped by some clients
- SVG icons do not render in email clients (Gmail, Outlook, Apple Mail all strip `<svg>` tags). Digest email uses hosted PNG icons at `public/email/icon-{birthday,anniversary,custom}.png` → `https://daysight.xyz/email/icon-*.png` instead of the `EventTypeIcon` component. Any future email templates must also use hosted `<img>` tags, never inline SVGs.
- Resend idempotency keys are deterministic — always include one when adding email-sending code
- `nextOccurrence()` and `formatEventDate()` are in `src/lib/reminders.ts` — never re-duplicate
- Per-user send cap checked both before AND inside event loop (tracks `userSendsThisRun` counter)
- Year rollover: the cron uses `eventYear` from `calendarDaysUntil()` for all year-dependent operations (`buildEventDateStr`, `shown_gifts.year`, `email_overrides`, `getLastYearLine`, `selectGiftsScored`). Never use `now.getFullYear()` — it breaks Dec cron runs for Jan events
- **Timezone-aware day math is mandatory** — `calendarDaysUntil()` uses `Intl.DateTimeFormat` to compute calendar days in the user's local timezone. Never use `daysBetween()` (deprecated, timestamp-based) for reminder logic — it produces off-by-one errors for users far from UTC. The old `nextOccurrence()` + `daysBetween()` pattern is replaced by `calendarDaysUntil()` which returns both `daysUntil` and `eventYear`
- **Retry policy is tunable in one place** — `MAX_RETRY_ATTEMPTS` (default 5) and `FAILED_RETRY_INTERVAL_MS` (default 2h) live in `src/lib/email-config.ts`. Together they govern how long a single reminder survives a Resend outage. Default coverage is ~10h; bump the cap to 12 to cover 24h. The cap counts `failed` + `expired` + `deferred` rows for the same `(user_id, event_id, event_date)` tuple. Changing these knobs has no schema impact — pure config.
- **Send-hour gating** — the reminder cron runs hourly but only processes users whose `localHour(now, timezone) === preferred_send_hour`. Users without a timezone default to `America/New_York`; users without a send hour default to 8 (8am). Send hours are every hour from 6am to 9pm (6–21) per `SEND_HOUR_OPTIONS`. **Requires reliable hourly cron execution** — on Vercel Hobby (once/day), most users would never match. Two independent hourly triggers hit `/api/cron/reminders`: cron-job.org at :37 UTC (reliable, the de facto primary) and GitHub Actions at :07 UTC (often delayed 2–15 minutes, occasionally drops a tick). Gating checks the hour, not the minute, so trigger drift is fine as long as the trigger lands inside the right UTC hour.
- **GitHub Actions cron workflow** — `.github/workflows/cron.yml` fires all 4 cron endpoints. A single job runs hourly; a "determine route" step checks the current UTC hour/day to decide which endpoints to hit (reminders always, digest on 1st–2nd of month, re-engagement at 13:00 UTC, purge at 04:00 UTC). Requires GitHub repo secrets `CRON_SECRET` and `SITE_URL`. `workflow_dispatch` enabled for manual testing. `vercel.json` crons have been removed (were causing Hobby plan deploy failures). **NOT the only trigger for `/api/cron/reminders`** — cron-job.org also hits that endpoint hourly at :37 UTC (configured outside the repo), and in practice is the more reliable of the two. Both use the same `CRON_SECRET` bearer auth. The reminder route is idempotent across simultaneous triggers via the partial unique index on `reminder_log` and Resend's idempotency keys; the route is safe to call twice in the same hour.
- Vercel deployment protection blocks API requests on previews — use `npx vercel curl` or test locally
- PostgREST `.or()` with `.in()` has quoting issues — use parallel queries instead (see gift-engine.ts)
- **Never use `supabase.auth.resend()` for verification emails when PKCE is active** — it doesn't regenerate the PKCE pair, so the link's code exchange fails. Use `signUp()` again (if you have the password) or rely on the auth callback's session-based fallback (if the user is already signed in). See `handleResendVerification` in `auth/page.tsx` and the fallback in `auth/callback/route.ts`.
- **Reset-password code exchange needs a ref guard** — `exchangeCodeForSession` in `reset-password/page.tsx` runs inside a `useEffect` whose dependencies (`searchParams`) can change when `router.replace` cleans the URL. Without a ref guard (`codeExchangedRef`), the effect re-runs, tries to exchange the already-consumed code, fails, and shows "Reset link expired" even though the session was established. Always use a ref to prevent double exchange.
- **Reset-password PKCE fallback** — When a password reset link opens via cross-site redirect (email client → Supabase → app), the PKCE `code_verifier` cookie may not be available, causing `exchangeCodeForSession()` to fail. However, Supabase also includes implicit-flow tokens in the URL hash as a fallback. The reset-password page handles this with `checkSessionWithRetry()` — after a failed code exchange, it retries `getSession()` with short delays to give the Supabase browser client time to detect and process the hash-fragment tokens. The `onAuthStateChange` listener for `PASSWORD_RECOVERY` also overrides `noSession` state if it fires.

## Gift Catalog Workflow

The XLS at the repo root (`Daysight Manual Amazon Inputs - XLS Format_v3.0.xlsx`) is the single source of truth for gift catalog content. **Do not edit `gift_catalog` via the Supabase SQL editor or via new migrations** — those edits will be reconciled away by the next sync. If you need a hotfix, update the XLS and re-sync.

**To change the catalog** (add, edit, deactivate gifts):

1. Edit the XLS — make any changes (add rows, edit fields, set `is_active` to `no` to deactivate). For new rows, you must assign a `ds_sku` yourself: lowercase, alphanumeric + hyphens, 2–80 chars, unique across the file. Convention: short and descriptive (e.g. `apple-airtag-gen2`, `peony-bouquet`).
2. If any gift is new or had its image source URL changed, run `node scripts/download-gift-images.mjs` first to pull/resize images into `public/gifts/`.
3. Run `node scripts/sync-gift-catalog.mjs --dry-run` to preview the diff. The output shows inserts, updates with per-field old → new, reactivations, and deactivations.
4. If the diff looks right, run `node scripts/sync-gift-catalog.mjs` (no flag). The script prompts for confirmation if any rows would be deactivated. Use `--yes` to skip the prompt for agent/CI runs, and `--note="reason"` to attach a human-readable note to every audit row in the run.

**Safety guards built into the script:**
- Validates every XLS row before any DB write (required fields, enum membership for category/price_tier/gender_tags, ds_sku format and uniqueness). Bails with line-numbered errors if anything is off.
- Refuses to proceed if a single run would deactivate more than 15% of currently-active gifts (override with `--force`, default cap tunable via `--max-deactivate-pct=N`).
- **Never DELETEs from `gift_catalog`.** Removed-from-XLS items get `is_active=false` (soft deactivation). This preserves the `shown_gifts.gift_id` FK and the `reminder_log.gift_ids[]` snapshots for historical reminders.
- Each gift_catalog write is paired with an audit row insert (action, changed_fields, old_values, new_values, run_id, run_by, optional note). If a partial failure leaves the DB mid-flight, the audit log records exactly what applied and the script is idempotent on re-run (it re-diffs against current state).
- **Cron-safe**: Postgres MVCC means the reminder cron's `SELECT * FROM gift_catalog WHERE is_active=true` either sees the full pre-sync state or the full post-sync state, never partial. Gift selection within one cron user iteration doesn't span the sync window. Soft-deactivation means past `reminder_log.gift_ids` references stay valid forever.

**Audit trail queries:**
- All changes from one sync run: `SELECT * FROM gift_catalog_audit WHERE run_id = '...' ORDER BY run_at;`
- All changes to one gift over time: `SELECT * FROM gift_catalog_audit WHERE gift_ds_sku = 'apple-airtag-gen2' ORDER BY run_at DESC;`
- Recent runs: `SELECT run_id, run_at, run_by, COUNT(*), array_agg(DISTINCT action) FROM gift_catalog_audit GROUP BY 1,2,3 ORDER BY run_at DESC LIMIT 10;`

**`ds_sku` semantics:**
- Daysight's internal stable identifier. **Never** derived from ASIN, name, or affiliate URL. ASIN stays in the XLS as internal reference for price-checking workflows and is not read by the sync script.
- For the 72 existing items (as of migration 023), `ds_sku` was backfilled from a slug-of-name with `-2/-3` suffixes on collisions.
- For new items, you choose `ds_sku`. Once stored, it never changes via the script. If a gift's identity should change (rare), update the `ds_sku` in the XLS and the script will treat it as deactivate-old + insert-new.

**Image filename truncation** is shared between `download-gift-images.mjs` (which writes `public/gifts/{slug.slice(0,60)}.jpg`) and `sync-gift-catalog.mjs` (which writes DB `image_url = https://daysight.xyz/gifts/{ds_sku.slice(0,60)}.jpg`). The 60-char cap is enforced in both places. If you ever lift it, lift it in both scripts in the same change to keep URL ↔ file alignment intact.

## Operational Rules (Hard-Won)

> Full bug/fix history: see `BUGFIX_LOG.md`. This section covers non-obvious rules that prevent regressions.

**RLS in admin code:** The browser client (anon key) obeys RLS even for `is_admin` users. `select count(*)` on `profiles` returns 1 (admin's own row). `gift_catalog` writes return zero rows with no error. **Rule:** Any admin query needing cross-user data or writes to unwritable tables must use a server-side route with the service-role admin client (`createAdminClient()`).

**Dedup status semantics:** Blocks subsequent sends: `sent`, `delivered`, `opened`, `clicked`, `bounced`. Does NOT block: `pending` (expires after 5 min), `failed`, `deferred`, `expired`. Retry cap: `MAX_RETRY_ATTEMPTS` (default 5) counting `failed` + `expired` + `deferred` per `(user_id, event_id, event_date)`. `bounced` is NOT counted toward the cap and is NOT retried — it's terminal by design (migration 021). Getting this wrong = duplicate emails, permanently stuck reminders, or daily re-sends to a bouncing address (the bug migration 021 fixed). **Enforced at the schema layer (migration 020 + 021):** the unique index `idx_reminder_log_dedup` is partial — `WHERE status IN ('pending','sent','delivered','opened','clicked','bounced')` — so retry-eligible rows do not occupy the unique slot but terminal rows (sent-and-engaged or bounced) do. Keep the cron's dedup-query predicate, the partial-index predicate, and this list aligned. If you ever add a new "blocking" status, update all four together (cron dedup query, Pass 2b live-row check, partial-index predicate, this list).

**Resend status lifecycle:** `sent` → `delivered` → `opened` → `clicked`. Count "successfully sent" with `.in("status", ["sent","delivered","opened","clicked"])` — not just `sent`.

**Email send pipeline debugging:** When emails aren't arriving, check the entire chain: (1) cron trigger firing? (2) env vars valid in production? (3) send-hour matching? (4) dedup not blocking? (5) Resend API succeeding? These failures are invisible in isolation.
