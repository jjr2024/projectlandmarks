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
- **GitHub Actions Cron** — reminders (hourly), digest (monthly), re-engagement (daily), purge (daily). Vercel Cron (`vercel.json`) is still configured as a harmless backup but Vercel Hobby only fires once/day at an unpredictable hour — GitHub Actions (`.github/workflows/cron.yml`) is the primary trigger. Requires two GitHub repo secrets: `CRON_SECRET` and `SITE_URL`.
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
│   ├── email-config.ts        From/replyTo, REMINDER_DAY_OPTIONS, REMINDER_TOLERANCE, SEND_HOUR_OPTIONS, defaults
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
.github/workflows/
└── cron.yml               Hourly cron trigger via GitHub Actions (primary; replaces Vercel Hobby's once/day limit)
```

## Architecture

**Data:** Supabase Postgres + RLS. Admin client (`lib/supabase/admin.ts`) uses service_role to bypass RLS for cron jobs.

**Soft-delete:** `deleted_at` on contacts and events. Purge cron hard-deletes after 7 days (cascades to events, reminder_log, shown_gifts). **One-time events:** The reminder cron skips one-time events whose date has passed (`event.one_time && event.event_year && oneTimeDate < now`). One-time events with `event_year: null` (legacy) are treated as recurring to avoid silently dropping reminders.

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

**Email system:** Supabase Auth emails (verification, password reset) are sent via Resend's SMTP relay — configured in Supabase Dashboard → Authentication → SMTP Settings with Resend credentials. This removes the built-in mailer's 3–4/hour rate limit. Transactional app emails (reminders, digest, re-engagement) use Resend's API directly. Three cron routes via Resend + React Email. The reminder cron runs **hourly** (`0 * * * *`). Each run only processes users whose current local hour (derived from `profiles.timezone` via `Intl.DateTimeFormat`) matches their `preferred_send_hour` (hourly options: 6am–9pm, i.e. 6–21 — stored in `profiles`, default 8). This ensures emails arrive at the user's chosen time regardless of timezone. **Day math is timezone-aware:** `calendarDaysUntil()` computes pure calendar days in the user's local timezone (May 25 → May 27 = 2, regardless of hour or UTC offset). No `Math.ceil`, no fractional days. Reminders respect the user's `reminder_days_before` preference (selectable: 1, 3, 7, 14, 21 days — stored in `profiles`, default `{7, 3}`). The cron passes the user's timezone to `calendarDaysUntil()`, then `matchReminderWindow()` checks against late-side-only tolerance windows (see Email Resilience). Events with `high_importance` always inject a 21-day reminder even if the user hasn't selected it. Email subject/body show **actual calendar days**, not the canonical window — e.g., "2 days" if the late-tolerance caught a 3-day reminder. When actual days !== canonical days, a small late-send note appears above the footer. After matching, the cron selects gifts, sends, and logs to `reminder_log` + `shown_gifts`. Digest = next-30-days lookahead (not calendar-month scoped); body copy says "in the next 30 days," subject uses current month name. Re-engagement = D+3/D+10/D+30 drip for zero-contact users (tracked in `profiles.drips_sent` JSONB, not `reminder_log`). All cron routes paginate `listUsers()` (1000/page loop) to handle >1000 users.

**Calendar feed:** `.ics` via `/api/calendar/[userId]`. One-time events use stored `event_year` with no `RRULE`; recurring events get `RRULE:FREQ=YEARLY`. Lines folded per RFC 5545 §3.1 (75-octet limit).

**Gift engine (`lib/gift-engine.ts`):** Deterministic weighted scoring. Weights: category (+40), budget tier (+20), gender match (+20) / gender mismatch (−10), relationship affinity (+15), event affinity (+15), tag overlap (+3/tag), last-minute bonus/penalty (±10–20), repeat penalty (−25/prior showing), PET_BONUS (+30 when contact.has_pets and gift category is "pet"), seeded shuffle (0–9). Returns top 3. No LLM. Fallback default categories: `["flowers", "home"]`. "pet" is engine-only (not user-selectable) — dynamically injected into query when `contact.has_pets` is true. Gender scoring uses `gender_tags` on `gift_catalog` (values: "woman", "man", "unisex", or empty for neutral). Contacts with gender "Other", "N/A", or null skip gender scoring entirely. `mapGenderToTag()` maps contact gender → gift tag. `relationship_affinities` and `event_affinities` support `"all"` as a wildcard — the scoring code checks `.includes("all")` as a universal match. When catalog values are populated with specific entries (e.g., `["family", "friend"]`), exact matching applies. Last-minute broadening uses two parallel queries (category match + is_last_minute=true) then deduplicates — do NOT use PostgREST `.or()` with `.in()` (quoting issues).

**Admin panel:** Analytics dashboard (KPIs, conversion funnel, breakdowns from `conversion_events`), email queue (per-slot custom message editor via `email_overrides`), gift catalog (read-only). Custom messages rendered as "A note from Daysight" in reminder emails. Dashboard user count fetched via `/api/admin/stats` (service-role client, bypasses RLS). Sent KPI counts all successful statuses (`sent`/`delivered`/`opened`/`clicked`), not just `sent`. Queue uses `calendarDaysUntil()` for timezone-aware day math (same as cron) and fetches per-user `reminder_days_before` to build accurate reminder windows. Gift catalog page is read-only — the master XLS is the single editable source of truth; DB is seeded from XLS.

**Webhooks:** `/api/webhooks/resend` → updates `reminder_log.status` + inserts to `conversion_events`. `/api/webhooks/affiliate` → inserts purchased event with commission.

## Email Resilience

Core logic in `src/lib/reminders.ts` (helpers) and `src/app/api/cron/reminders/route.ts` (two-pass architecture). Six mechanisms:

1. **Pre-send logging:** Insert `reminder_log` with `status='pending'` before Resend call. Update to sent/failed/deferred after. Unique index on `(user_id, event_id, days_before, event_date)` guards against race conditions (catch Postgres 23505 = already handled).
2. **Idempotency keys:** `ds-{userId}-{eventId}-{canonicalDays}-{date}` header on every Resend call.
3. **Range-based windows:** Per-user selectable reminder days (1, 3, 7, 14, 21) with late-side-only tolerance for cron outage recovery. Windows never fire early — only extend backward: 21→[19–21], 14→[12–14], 7→[5–7], 3→[2–3], 1→[0–1]. `high_importance` events inject day 21 regardless of user preference. Falls back to `DEFAULT_REMINDER_DAYS` [7, 3] if user preference is null/empty. Config in `REMINDER_DAY_OPTIONS` and `REMINDER_TOLERANCE` (`email-config.ts`); matching in `matchReminderWindow(daysUntil, highImportance, userDays)` (`reminders.ts`).
4. **Per-user send cap:** Max 3 emails/user/day. Checked before and during event loop. Excess deferred to next run.
5. **429 handling:** On rate limit, mark deferred, break user loop immediately. Retry on next cron run.

6. **Stale pending recovery (two-pass):** The reminder cron runs two passes. Pass 1 is the normal send-hour-gated loop. The dedup query in Pass 1 only blocks on `sent`/`delivered`/`opened`/`clicked` statuses. If a "pending" row is older than 5 minutes, it's marked `"expired"` (preserving audit history) and the event is re-processed. `"failed"` and `"deferred"` rows never block retries. A retry cap of 3 `failed`+`expired` attempts per `(user_id, event_id, event_date)` prevents infinite retries on permanently broken events. Pass 2 runs after Pass 1 and scans for any remaining stale "pending" rows across ALL users (regardless of send hour), expires them, and retries. This ensures a failed 6pm email doesn't have to wait until the next day's 6pm slot — the next hourly cron run picks it up. Retry idempotency keys append `-retry-{timestamp}` to avoid Resend dedup collisions with the original attempt.

**Not covered:** Digest and re-engagement lack pre-send dedup (acceptable). Outages >2 days permanently miss events outside tolerance ranges. The 1-day window has only 1-day tolerance (range [0–1]) so a 2-day outage misses it.

## Supabase Schema

| Table | Key columns |
|---|---|
| `profiles` | display_name, timezone, preferred_send_hour, reminder_days_before, drips_sent, consent_terms, consent_emails, email_reminders_enabled, monthly_digest_enabled |
| `contacts` | first_name, last_name, relationship, gender, gift_categories, budget_tier, has_pets, deleted_at |
| `events` | event_type, month, day, high_importance, suppress_gifts, one_time, event_year, contact_id FK, user_id, deleted_at |
| `reminder_log` | user_id, event_id, contact_id, days_before, event_date, resend_id, status, gift_ids |
| `shown_gifts` | contact_id, gift_id, year |
| `gift_catalog` | name, category, partner, price_tier, description, tags, gender_tags, affiliate_url, is_active, is_last_minute |
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
- Digest/re-engagement cron routes lack pre-send dedup (acceptable tradeoff)
- Remaining from prototype: data export
- Affiliate webhook accepts unverified user_id-only postbacks (trade-off T-1 — pending owner decision on HMAC/stricter validation)
- Resend spam complaints mapped to "bounced" status instead of triggering auto-unsubscribe (trade-off T-2 — pending owner decision)
- `shown_gifts` insert errors silently swallowed in reminder cron (acceptable — doesn't block email delivery)
- **Dedup blocks retries on stuck "pending" rows (FIXED):** The reminder cron's dedup query now only blocks on `sent`/`delivered`/`opened`/`clicked`. Stale "pending" rows (>5 min old) are marked `"expired"` and retried. A two-pass architecture retries across all users regardless of send hour. Retry cap of 3 `failed`+`expired` attempts prevents infinite retries. See Email Resilience § "Stale pending recovery" for details.
- **Vercel Hobby cron limitation:** `vercel.json` defines `0 * * * *` (hourly) for reminders, but Vercel Hobby plan only runs crons once per day at an unpredictable hour. This means send-hour gating (which requires hourly execution to match each user's preferred hour) fails for most users. Mitigated by GitHub Actions cron (`.github/workflows/cron.yml`) as the primary trigger. `vercel.json` crons left in place as harmless backup — idempotency logic prevents duplicate sends if both fire in the same hour.
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
- **Send-hour gating** — the reminder cron runs hourly but only processes users whose `localHour(now, timezone) === preferred_send_hour`. Users without a timezone default to `America/New_York`; users without a send hour default to 8 (8am). Send hours are every hour from 6am to 9pm (6–21) per `SEND_HOUR_OPTIONS`. **Requires hourly cron execution** — on Vercel Hobby (once/day), most users will never match. GitHub Actions (`.github/workflows/cron.yml`) is the primary hourly trigger. GitHub Actions cron can be delayed 2–15 minutes (occasionally longer); this is fine since gating checks the hour, not the minute.
- **GitHub Actions cron workflow** — `.github/workflows/cron.yml` fires all 4 cron endpoints. A single job runs hourly; a "determine route" step checks the current UTC hour/day to decide which endpoints to hit (reminders always, others at their specific times). Requires GitHub repo secrets `CRON_SECRET` and `SITE_URL`. `workflow_dispatch` enabled for manual testing. The `vercel.json` crons remain as redundant backup — idempotency prevents duplicates
- Vercel deployment protection blocks API requests on previews — use `npx vercel curl` or test locally
- PostgREST `.or()` with `.in()` has quoting issues — use parallel queries instead (see gift-engine.ts)
- **Never use `supabase.auth.resend()` for verification emails when PKCE is active** — it doesn't regenerate the PKCE pair, so the link's code exchange fails. Use `signUp()` again (if you have the password) or rely on the auth callback's session-based fallback (if the user is already signed in). See `handleResendVerification` in `auth/page.tsx` and the fallback in `auth/callback/route.ts`.
- **Reset-password code exchange needs a ref guard** — `exchangeCodeForSession` in `reset-password/page.tsx` runs inside a `useEffect` whose dependencies (`searchParams`) can change when `router.replace` cleans the URL. Without a ref guard (`codeExchangedRef`), the effect re-runs, tries to exchange the already-consumed code, fails, and shows "Reset link expired" even though the session was established. Always use a ref to prevent double exchange.
- **Reset-password PKCE fallback** — When a password reset link opens via cross-site redirect (email client → Supabase → app), the PKCE `code_verifier` cookie may not be available, causing `exchangeCodeForSession()` to fail. However, Supabase also includes implicit-flow tokens in the URL hash as a fallback. The reset-password page handles this with `checkSessionWithRetry()` — after a failed code exchange, it retries `getSession()` with short delays to give the Supabase browser client time to detect and process the hash-fragment tokens. The `onAuthStateChange` listener for `PASSWORD_RECOVERY` also overrides `noSession` state if it fires.

## Debugging History & Operational Learnings

This section documents root causes, design decisions, and hard-won lessons from production debugging sessions. Included so future developers (and AI assistants) don't re-derive these conclusions or regress to intermediate hypotheses that were later disproven.

### The "Emails Not Sending" Incident (May 2026)

Reminder emails were not reaching users despite contacts and events being correctly configured. The root cause was a **chain of three interconnected failures**, not a single bug:

1. **Vercel Hobby fires cron once/day, not hourly.** `vercel.json` accepted `0 * * * *` syntax without error, but Vercel Hobby silently only executes it once per day at an unpredictable hour. Since send-hour gating requires hourly execution to match each user's preferred hour, most users never had their hour matched. There was no error and no log — the cron simply didn't fire. **Fix:** GitHub Actions as primary hourly trigger.

2. **Missing Vercel env vars caused mid-flight failure.** Once GitHub Actions was firing the cron correctly, the cron route started but `env.ts` validation threw because `RESEND_WEBHOOK_SECRET` and `AFFILIATE_WEBHOOK_SECRET` were placeholders in Vercel production. The failure happened **after** the pre-send "pending" row was inserted into `reminder_log`, but **before** the Resend API call.

3. **Stuck "pending" rows permanently blocked retries.** The original dedup query treated any existing row (including `pending`) as "already handled" and skipped the event. A pending row from a failed run would persist forever, preventing that reminder from ever being sent on future runs. The event was silently dropped.

**Key takeaway:** These three bugs were invisible in isolation. Vercel's cron silence hid problem #1 for weeks. Problem #2 only surfaced once #1 was fixed. Problem #3 only mattered because #2 left rows in a bad state. Always check the **entire send pipeline** end-to-end when debugging email delivery.

### Design Decision: "expired" Status, Not Deletion

We considered two approaches for stuck pending rows: (a) delete them and re-insert, or (b) mark them with a new `"expired"` status and insert a fresh row. We chose (b) because deletion loses audit history. With `expired`, you can query `reminder_log` and reconstruct the full retry timeline: `pending → expired → pending → sent` (success after one retry) or `pending → expired → pending → expired → pending → expired` (gave up after 3 attempts). This matters for debugging delivery issues and understanding system health.

### Design Decision: Two-Pass Retry Architecture

Pass 1 of the reminder cron is send-hour-gated (only processes users whose local hour matches their preference). If a 6pm email fails in Pass 1, the original design required waiting until the next day's 6pm run — a 24-hour delay. Pass 2 was added to solve this: after Pass 1 completes, Pass 2 scans for stale pending rows across ALL users regardless of send hour, expires them, and retries immediately. This means a failed 6pm email gets retried at the next hourly cron run (7pm, 8pm, etc.), not the next 6pm.

**Why not just remove send-hour gating from retries in Pass 1?** Pass 1 iterates users filtered by send hour. Pass 2 operates on `reminder_log` rows directly (no user filtering), which is structurally simpler and doesn't require changing the Pass 1 user-selection query.

### Dedup Status Semantics (Critical)

The dedup query's behavior depends entirely on which statuses it treats as "blocking." Getting this wrong either causes duplicate emails or permanently blocks retries:

- **Blocks (truly sent):** `sent`, `delivered`, `opened`, `clicked` — the email reached Resend successfully. Even if it's only "sent" (not yet delivered), Resend has it and will deliver.
- **Does NOT block:** `pending` (might be stale from a crashed run — checked for staleness via 5-minute threshold), `failed` (should retry), `deferred` (should retry), `expired` (already handled and cleared for retry).
- **Retry cap:** 3 cumulative `failed` + `expired` attempts per `(user_id, event_id, event_date)` to prevent infinite retries on permanently broken events (e.g., invalid email, permanently missing template data).

### RLS Pitfalls in Admin Code

Two patterns to watch for when writing admin-facing features:

1. **Silent data limitation.** The Supabase browser client (anon key) is subject to RLS even when the logged-in user has `is_admin = true`. Queries like `select count(*)` on `profiles` return 1 (the admin's own row), not the actual total. The query doesn't error — it just returns incomplete results. **Solution:** Admin queries needing cross-user data must go through a server-side API route (`/api/admin/stats`) that uses the service-role admin client (`createAdminClient()`).

2. **Silent write failure.** `gift_catalog` has no RLS INSERT/UPDATE policies. The admin page had full CRUD UI (add, edit, deactivate), but writes via the browser client returned zero affected rows with no error. The UI appeared to work — the form submitted, no error toast appeared — but nothing was saved to the database. **Resolution:** Made the page read-only. The master XLS is the single editable source of truth; the DB is seeded from the XLS. If write functionality is ever needed, it must go through a server-side route with the admin client, like the stats endpoint does.

### Year Rollover in All Date Code

Any code that computes event dates must use `eventYear` from `calendarDaysUntil()`, never `now.getFullYear()`. In December, a January event's `eventYear` is next year. Using the current year produces wrong dates for `buildEventDateStr`, `email_overrides.event_year`, `shown_gifts.year`, and dedup keys. This applies to **both cron code and admin UI code** — the queue page originally used `now.getFullYear()` and was fixed to use `item.eventYear`.

### Resend Webhook Status Progression

Resend advances email status through a lifecycle: `sent` → `delivered` → `opened` → `clicked`. Each transition fires a webhook callback to `/api/webhooks/resend`, which updates `reminder_log.status`. When counting "successfully sent" emails for metrics, always use `.in("status", ["sent", "delivered", "opened", "clicked"])`. Counting only `status = 'sent'` undercounts because most emails have been advanced past that status by the time you query.

### GitHub Actions Cron Reliability

GitHub Actions `schedule` triggers are not real-time. Observed behavior: delays of 2–53 minutes are common, and runs are occasionally skipped entirely during periods of heavy GitHub load. For send-hour gating (checks the hour, not the minute), delays under ~60 minutes are acceptable. Skipped runs are covered by the two-pass retry architecture. The `vercel.json` crons remain as redundant backup — if both GitHub Actions and Vercel fire in the same hour, the dedup key prevents double-sends. If GitHub Actions reliability becomes a persistent problem, consider migrating to cron-job.org or a similar dedicated service.

### `email_reminders_enabled` vs. `consent_emails`

These are two separate gates, both of which must be true for a user to receive reminder emails:

- `consent_emails` — legal consent to receive emails with affiliate content. Set during signup, can be revoked via unsubscribe link (HMAC-signed). Revoking shows a persistent banner in the app directing user to Settings to re-subscribe. This is a **compliance** gate.
- `email_reminders_enabled` — user preference toggle in Settings. Controls whether the reminder cron processes this user. Disabling shows a `window.confirm()` warning and a red inline warning. This is a **feature** gate.

Both are checked in the cron (Pass 1 and Pass 2). The digest cron has its own independent `monthly_digest_enabled` toggle.
