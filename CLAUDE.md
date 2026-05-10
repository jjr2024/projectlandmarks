# CLAUDE.md — Daysight (codename: Landmarks)

> **Naming:** External brand = **Daysight**. "Landmarks" = internal codename (folder names, docx filenames). User-facing text must say "Daysight." Domain: `daysight.xyz`.

## Project Status

**Production-ready.** Next.js + Supabase + Resend + Vercel, live and auto-deploying. Phases 1–9 complete. UI conformity sweep deferred to post-launch.

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
│   ├── about|privacy|terms|contact|consent|unsubscribe/  Public pages
│   ├── auth/                  Sign in/up, callback, forgot-password, reset-password
│   └── api/
│       ├── cron/              reminders, digest, reengagement, purge
│       ├── webhooks/          resend, affiliate
│       ├── contact/           Contact form → Resend
│       ├── calendar/[userId]  .ics feed (HMAC-signed)
│       ├── calendar-url/      Signed calendar URL
│       └── unsubscribe/       HMAC-verified unsubscribe
├── components/                sidebar, admin-sidebar, marketing-nav, marketing-footer, email-verification-banner, gift-icons
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
├── 013 add pronoun→gender to contacts    014 rename pronoun to gender (Male/Female/Other/N/A)
```

## Architecture

**Data:** Supabase Postgres + RLS. Admin client (`lib/supabase/admin.ts`) uses service_role to bypass RLS for cron jobs.

**Soft-delete:** `deleted_at` on contacts and events. Purge cron hard-deletes after 7 days (cascades to events, reminder_log, shown_gifts).

**Route groups:** `(app)` = auth'd sidebar layout. `(onboarding)` = isolated layout. `(admin)` = admin sidebar, gated on `profiles.is_admin`.

**Middleware:** Supabase SSR cookies. Protects app routes → redirects unauth'd to `/auth`. Redirects auth'd away from `/auth` (except reset-password).

**Auth:** Supabase Auth. Email verification required — no emails sent to unverified addresses (GDPR/CAN-SPAM: emails contain affiliate links). Password changes use `reauthenticate()` (nonce-based, no duplicate session).

**Consent gating:** Two mandatory signup checkboxes (Terms+Privacy, affiliate emails). Stored in `profiles` via `handle_new_user()` trigger. Existing users without consent redirected to `/consent`. Cron routes also gate on consent.

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

**Email system:** Three cron routes via Resend + React Email. Reminders match events to 21/7/3-day windows, select gifts, send, log to `reminder_log` + `shown_gifts`. Digest = monthly summary. Re-engagement = D+3/D+10/D+30 drip for zero-contact users (tracked in `profiles.drips_sent` JSONB, not `reminder_log`).

**Gift engine (`lib/gift-engine.ts`):** Deterministic weighted scoring. Weights: category (+40), budget tier (+20), relationship affinity (+15), event affinity (+15), tag overlap (+3/tag), last-minute bonus/penalty (±10–20), repeat penalty (−25/prior showing), seeded shuffle (0–9). Returns top 3. No LLM. Fallback gifts scored through same pipeline.

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
| `contacts` | first_name, last_name, relationship, gender, gift_categories, budget_tier, deleted_at |
| `events` | event_type, month, day, high_importance, suppress_gifts, contact_id FK, user_id, deleted_at |
| `reminder_log` | user_id, event_id, contact_id, days_before, event_date, resend_id, status, gift_ids |
| `shown_gifts` | contact_id, gift_id, year |
| `gift_catalog` | name, category, partner, price_tier, tags, affiliate_url, is_active, is_last_minute |
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
| `/api/contact` | POST | IP rate limit (5/15min) | Contact form → Resend |
| `/api/calendar/[userId]` | GET | HMAC token | .ics feed |
| `/api/calendar-url` | GET | Session cookie | Signed calendar URL |
| `/api/unsubscribe` | POST | HMAC uid+token | Set consent_emails=false |
| `/auth/callback` | GET | — | OAuth/magic-link → session |

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

## Known Limitations

- No Google OAuth (disabled with "coming soon" in prototype)
- Affiliate links are placeholder URLs — no real program connected
- No contact import (CSV, Google Contacts, vCard)
- UI conformity sweep needed (visual drift between prototype and Next.js)
- Privacy Policy and Terms have mismatched retention timelines
- GDPR legal basis vague — should map processing activities to specific bases
- No `robots.txt` or `sitemap.xml`
- Contact form rate limiting is in-memory (bypassable on serverless). Consider Upstash Redis.
- Digest/re-engagement cron routes lack pre-send dedup (acceptable tradeoff)
- Remaining from prototype: data export

## Gotchas

- `npm run build` before push — Vercel strict mode catches errors `next dev` misses. However, full builds typically time out in constrained environments (e.g. Cowork). Use `npx tsc --noEmit` for fast type-checking during AI-assisted sessions; reserve full `npm run build` for local terminal sessions.
- `useSearchParams()` needs `<Suspense>` boundary in Next.js 14 production builds
- Use individual `@react-email/*` packages, not the unified `react-email` (heavy CLI)
- `Precedence: bulk` header removed — was causing Gmail Promotions classification
- Emails: pixels only (no rem/em/%), stacked layout for gift cards, `inline-block` buttons
- Resend idempotency keys are deterministic — always include one when adding email-sending code
- `nextOccurrence()` and `formatEventDate()` are in `src/lib/reminders.ts` — never re-duplicate
- Per-user send cap checked both before AND inside event loop (tracks `userSendsThisRun` counter)
- Vercel deployment protection blocks API requests on previews — use `npx vercel curl` or test locally
