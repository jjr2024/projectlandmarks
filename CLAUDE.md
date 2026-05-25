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
- **Vercel Cron** — reminders (daily), digest (monthly), re-engagement (daily), purge (daily)
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
│   ├── email-config.ts        From/replyTo, reminder windows
│   ├── env.ts                 Server env validation
│   ├── gift-engine.ts         Weighted scoring: scoreGift() + selectGiftsScored()
│   ├── reminders.ts           Date math, window matching, idempotency, send caps, rate-limit detection
│   ├── resend.ts              Resend client
│   ├── tokens.ts              HMAC token gen/verify (unsubscribe, calendar)
│   ├── utils.ts               compareTokens (timing-safe), misc
│   ├── errors.ts              friendlyError() — sanitizes Supabase errors for UI
│   └── constants.ts           GIFT_CATEGORIES
├── __tests__/reminders.test.ts  80 unit tests
└── middleware.ts              Auth guard for /dashboard, /contacts, /settings, /onboarding, /admin, /consent
supabase/migrations/
├── 001 Core tables    002 drips_sent JSONB    003 email resilience    004 gift catalog seed
├── 005 email_overrides    006 atomic drips_sent RPC    007 consent columns    008 delete_user_account RPC
├── 009 event soft delete    010 RLS deny writes    011 fix email cap index    012 anonymize conversion_events
├── 013 add pronoun→gender    014 rename pronoun to gender (Male/Female/Other/N/A)
├── 015 add has_pets boolean    016 remap gift categories, reseed catalog, add gender_tags, update defaults
├── 017 seed 5 new gift catalog items (XLS v3.0)
├── 018 populate image_url with self-hosted paths
```

## Architecture

**Data:** Supabase Postgres + RLS. Admin client (`lib/supabase/admin.ts`) uses service_role to bypass RLS for cron jobs.

**Soft-delete:** `deleted_at` on contacts and events. Purge cron hard-deletes after 7 days (cascades to events, reminder_log, shown_gifts).

**Route groups:** `(app)` = auth'd sidebar layout. `(onboarding)` = isolated layout. `(admin)` = admin sidebar, gated on `profiles.is_admin`.

**Onboarding:** 4-step flow (Welcome → Contact+Events → Gift prefs → Done). Collects full contact fields including notes. Events include "Other options" expandable (year_started, one_time, event_year) — collapsed by default to keep the happy path clean. Icons use inline SVGs (no emojis). "Skip gifts" is a toggle button, not a checkbox.

**Public pages:** Contact page is a simple static page with a mailto link to info@daysight.xyz (no form, no API route). Privacy policy has no disclaimer banner. Terms and privacy both reference email-only contact.

**Middleware:** Supabase SSR cookies. Protects app routes → redirects unauth'd to `/auth`. Redirects auth'd away from `/auth` (except reset-password).

**Auth:** Supabase Auth with PKCE flow (`@supabase/ssr` default). Email verification required — no emails sent to unverified addresses (GDPR/CAN-SPAM: emails contain affiliate links). Password changes use `reauthenticate()` (nonce-based, no duplicate session). Post-signup success screen and in-app `EmailVerificationBanner` both offer resend-verification with 60-second cooldown (persisted to `sessionStorage`). **PKCE caveat:** `supabase.auth.resend()` does NOT regenerate the PKCE `code_verifier`/`code_challenge` pair, so re-sent verification links fail at `exchangeCodeForSession()`. Two mitigations: (1) the post-signup screen uses `signUp()` again instead of `resend()`, which generates a fresh PKCE pair (works because `email`/`password` are still in component state); (2) the in-app banner still uses `resend()` (no password available), but the auth callback has a fallback — if code exchange fails and the user already has an active session, it redirects to `/dashboard` instead of showing an error (email is verified server-side by Supabase before the redirect regardless of PKCE outcome).

**Consent gating:** Two mandatory signup checkboxes (Terms+Privacy, affiliate emails). Stored in `profiles` via `handle_new_user()` trigger. Layout gate (`(app)/layout.tsx`) only checks `consent_terms` — users without terms acceptance are redirected to `/consent`. `consent_emails` is handled separately: unsubscribed users (terms=true, emails=false) stay in the app but see a persistent `EmailUnsubscribedBanner` directing them to Settings to re-enable. The Settings page has a re-subscribe block that sets `consent_emails` back to true. Cron routes independently gate on both `consent_terms` and `consent_emails`.

**Security:**
- Timing-safe token comparison (`compareTokens()`) on all cron/webhook auth
- Open redirect protection on auth callback
- Bearer-only webhook auth (no svix-id fallback)
- HMAC-signed unsubscribe + calendar URLs (no raw UUIDs)
- Affiliate webhook validates user_id ownership against reminder_log
- Generic forgot-password response (prevents email enumeration)
- Atomic account deletion via RPC `delete_user_account()`
- All client-side update/delete queries include `.eq("user_id", userId)` alongside RLS
- `friendlyError()` sanitizes all Supabase errors shown to users
- Exact string matching on gift tags (no substring)

**Email system:** Supabase Auth emails (verification, password reset) are sent via Resend's SMTP relay — configured in Supabase Dashboard → Authentication → SMTP Settings with Resend credentials. This removes the built-in mailer's 3–4/hour rate limit. Transactional app emails (reminders, digest, re-engagement) use Resend's API directly. Three cron routes via Resend + React Email. Reminders match events to 21/7/3-day windows, select gifts, send, log to `reminder_log` + `shown_gifts`. Digest = next-30-days lookahead (not calendar-month scoped); body copy says "in the next 30 days," subject uses current month name. Re-engagement = D+3/D+10/D+30 drip for zero-contact users (tracked in `profiles.drips_sent` JSONB, not `reminder_log`). All cron routes paginate `listUsers()` (1000/page loop) to handle >1000 users.

**Calendar feed:** `.ics` via `/api/calendar/[userId]`. One-time events use stored `event_year` with no `RRULE`; recurring events get `RRULE:FREQ=YEARLY`. Lines folded per RFC 5545 §3.1 (75-octet limit).

**Gift engine (`lib/gift-engine.ts`):** Deterministic weighted scoring. Weights: category (+40), budget tier (+20), gender match (+20) / gender mismatch (−10), relationship affinity (+15), event affinity (+15), tag overlap (+3/tag), last-minute bonus/penalty (±10–20), repeat penalty (−25/prior showing), PET_BONUS (+30 when contact.has_pets and gift category is "pet"), seeded shuffle (0–9). Returns top 3. No LLM. Fallback default categories: `["flowers", "home"]`. "pet" is engine-only (not user-selectable) — dynamically injected into query when `contact.has_pets` is true. Gender scoring uses `gender_tags` on `gift_catalog` (values: "woman", "man", "unisex", or empty for neutral). Contacts with gender "Other", "N/A", or null skip gender scoring entirely. `mapGenderToTag()` maps contact gender → gift tag. Last-minute broadening uses two parallel queries (category match + is_last_minute=true) then deduplicates — do NOT use PostgREST `.or()` with `.in()` (quoting issues).

**Admin panel:** Analytics dashboard (KPIs, conversion funnel, breakdowns from `conversion_events`), email queue (per-slot custom message editor via `email_overrides`), gift catalog CRUD. Custom messages rendered as "A note from Daysight" in reminder emails.

**Webhooks:** `/api/webhooks/resend` → updates `reminder_log.status` + inserts to `conversion_events`. `/api/webhooks/affiliate` → inserts purchased event with commission.

## Email Resilience

Core logic in `src/lib/reminders.ts`. Five mechanisms:

1. **Pre-send logging:** Insert `reminder_log` with `status='pending'` before Resend call. Update to sent/failed/deferred after. Unique index on `(user_id, event_id, days_before, event_date)` guards against race conditions (catch Postgres 23505 = already handled).
2. **Idempotency keys:** `ds-{userId}-{eventId}-{canonicalDays}-{date}` header on every Resend call.
3. **Range-based windows:** ±2 day tolerance (5–7→canonical 7, 1–3→canonical 3, 19–21→canonical 21). Self-healing for outages up to 2 days. Function: `matchReminderWindow()`.
4. **Per-user send cap:** Max 3 emails/user/day. Checked before and during event loop. Excess deferred to next run.
5. **429 handling:** On rate limit, mark deferred, break user loop immediately. Retry on next cron run.

**Not covered:** Digest and re-engagement lack pre-send dedup (acceptable). Outages >2 days permanently miss events outside all ranges.

## Supabase Schema

| Table | Key columns |
|---|---|
| `profiles` | display_name, timezone, preferred_send_hour, drips_sent, consent_terms, consent_emails |
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
| `/api/cron/reminders` | GET | `Bearer CRON_SECRET` | Daily 12:00 UTC — send reminders |
| `/api/cron/digest` | GET | `Bearer CRON_SECRET` | 1st of month 14:00 UTC — monthly digest |
| `/api/cron/reengagement` | GET | `Bearer CRON_SECRET` | Daily 13:00 UTC — D+3/D+10/D+30 drip |
| `/api/cron/purge` | GET | `Bearer CRON_SECRET` | Daily 04:00 UTC — hard-delete expired trash |
| `/api/webhooks/resend` | POST | `Bearer RESEND_WEBHOOK_SECRET` | Delivery events → reminder_log + conversion_events |
| `/api/webhooks/affiliate` | POST | `Bearer AFFILIATE_WEBHOOK_SECRET` | Purchase postbacks → conversion_events |
| `/api/calendar/[userId]` | GET | HMAC token | .ics feed |
| `/api/calendar-url` | GET | Session cookie | Signed calendar URL |
| `/api/unsubscribe` | POST | HMAC uid+token | Set consent_emails=false |
| `/auth/callback` | GET | — | OAuth/magic-link/verification → session (PKCE fallback: redirects to app if exchange fails but session exists) |

## Key Files (Read First)

1. This file
2. `src/app/api/cron/reminders/route.ts` — core business logic
3. `src/emails/reminder.tsx` — what users receive
4. `src/lib/email-config.ts` — email config + reminder windows
5. `src/middleware.ts` — auth routing
6. `supabase/migrations/001_initial_schema.sql` — data model

## Conventions

- Dates stored as month (1–12) + day (1–31), not Date objects
- Emails from `noreply@daysight.xyz`, replyTo `support@daysight.xyz`
- Brand color: `brand-600` = `#d05a32` (orange-warm)
- Urgency: 0–3 days = red, 4–7 = orange, 8+ = green
- Auth errors: always generic "Invalid email or password" on sign-in (no email enumeration). Duplicate email detected via empty `identities` array.
- Domain: `daysight.xyz`
- Gift categories (12 user-selectable): flowers, wine, food_snacks, home, books, electronics, sports, apparel, beauty, jewelry, wellness, games_toys. Plus `pet` (engine-only, not user-selectable — triggered by `has_pets` toggle on contacts)
- Gender tags on gifts: `"woman"`, `"man"`, `"unisex"`, or empty (gender-neutral). Stored in `gift_catalog.gender_tags` text[]. Admin UI exposes a multi-select. Contacts with gender Other/N/A/null skip gender scoring.

## Known Limitations

- No Google OAuth (disabled with "coming soon" in prototype)
- Affiliate links use clean `/dp/ASIN?tag=` format for Amazon; UrbanStems/Wine.com use original URLs
- Gift catalog XLS v3.0 (72 items) has `clean_affiliate_url` column (use this for DB seeding, not `affiliate_url`). XLS also contains internal-reference columns not used by the webapp: `is_active`, `asin`, `current_price`, `star_rating`, `review_count`, `last_updated`, `affiliate`. XLS `image_url` is the Amazon CDN source URL (used by the download script only — never hotlinked in emails). DB `image_url` stores self-hosted paths (`https://daysight.xyz/gifts/{slug}.jpg`). XLS descriptions are the source of truth for product copy.
- `relationship_affinities` and `event_affinities` default to "all" in catalog — scoring weights (+15 each) are unused until populated
- `is_last_minute` is over-tagged (97% = yes) — needs audit to flag only truly instant-delivery items
- No contact import (CSV, Google Contacts, vCard)
- Privacy Policy and Terms have mismatched retention timelines
- GDPR legal basis vague — should map processing activities to specific bases
- Digest/re-engagement cron routes lack pre-send dedup (acceptable tradeoff)
- Remaining from prototype: data export
- Affiliate webhook accepts unverified user_id-only postbacks (trade-off T-1 — pending owner decision on HMAC/stricter validation)
- Resend spam complaints mapped to "bounced" status instead of triggering auto-unsubscribe (trade-off T-2 — pending owner decision)
- `shown_gifts` insert errors silently swallowed in reminder cron (acceptable — doesn't block email delivery)

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
- Year rollover: `buildEventDateStr()` uses `eventDate.getFullYear()` (from `nextOccurrence()`), NOT `now.getFullYear()` — fixes Dec cron runs for Jan events
- Vercel deployment protection blocks API requests on previews — use `npx vercel curl` or test locally
- PostgREST `.or()` with `.in()` has quoting issues — use parallel queries instead (see gift-engine.ts)
- **Never use `supabase.auth.resend()` for verification emails when PKCE is active** — it doesn't regenerate the PKCE pair, so the link's code exchange fails. Use `signUp()` again (if you have the password) or rely on the auth callback's session-based fallback (if the user is already signed in). See `handleResendVerification` in `auth/page.tsx` and the fallback in `auth/callback/route.ts`.
- **Reset-password code exchange needs a ref guard** — `exchangeCodeForSession` in `reset-password/page.tsx` runs inside a `useEffect` whose dependencies (`searchParams`) can change when `router.replace` cleans the URL. Without a ref guard (`codeExchangedRef`), the effect re-runs, tries to exchange the already-consumed code, fails, and shows "Reset link expired" even though the session was established. Always use a ref to prevent double exchange.
- **Reset-password PKCE fallback** — When a password reset link opens via cross-site redirect (email client → Supabase → app), the PKCE `code_verifier` cookie may not be available, causing `exchangeCodeForSession()` to fail. However, Supabase also includes implicit-flow tokens in the URL hash as a fallback. The reset-password page handles this with `checkSessionWithRetry()` — after a failed code exchange, it retries `getSession()` with short delays to give the Supabase browser client time to detect and process the hash-fragment tokens. The `onAuthStateChange` listener for `PASSWORD_RECOVERY` also overrides `noSession` state if it fires. Debug info (tiny red text) is shown on the error screen for diagnosis — remove once PKCE issues are confirmed resolved.
