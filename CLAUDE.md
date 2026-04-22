# CLAUDE.md — Daysight (internal codename: Landmarks)

> **Naming convention:** The external brand name is **Daysight**. "Landmarks" is the internal codename used in folder names, docx filenames, and developer-facing references. All user-facing UI, emails, legal pages, and marketing copy must use "Daysight." The production domain is `daysight.xyz`.

## Project Status

**Partially migrated to production.** The Next.js + Supabase + Resend + Vercel stack is live and auto-deploying from GitHub. Phases 1–8 of the production migration are complete (scaffold, Supabase integration, auth, core CRUD, email templates + cron routes, gift recommendation engine, admin panel, marketing pages). Phase 9 remains (testing/polish/go-live). A UI conformity sweep is deferred to post-Phase 9.

The original vanilla HTML/Alpine.js/localStorage prototype files still exist in the repo root for reference but are **no longer the primary codebase**. All new development targets the Next.js app in `src/`.

## What Daysight Is

An email-first birthday and gift reminder service for busy professionals. Users enter contacts and key dates once, pick gift preferences, and receive timely reminder emails with curated affiliate gift links. Free to the user; revenue comes from affiliate commissions on purchases made through those links.

Core insight: calendar reminders tell you a birthday is coming — Daysight tells you what to do about it.

## Quick Start (Production App)

```bash
npm install
cp .env.local.example .env.local     # fill in Supabase + Resend keys (see Environment Variables below)
npm run dev                           # http://localhost:3000
npm run build                         # always run before pushing — catches TS errors Vercel will reject
```

Deployed automatically on push to GitHub via Vercel.

### Prototype (legacy, read-only reference)

```
open index.html                       # or python3 -m http.server 3000
```
Demo account: `demo@daysight.app` / `demo1234` (seeded on first load).
Admin panel: `admin.html` — `admin@daysight.app` / `LM-admin-2026!`.

## Tech Stack

**Production (current):**
- **Next.js 14 on Vercel** — React, App Router, API routes, middleware
- **Supabase** — Postgres + Auth + Row-Level Security
- **Resend** — transactional email via React Email templates
- **Vercel Cron** — daily reminders, monthly digest, re-engagement drip
- **TypeScript** — strict mode, `@/*` path alias → `./src/*`
- **Tailwind CSS** — compiled via PostCSS (not CDN)

**Prototype (legacy, root HTML files):**
- HTML5 + Alpine.js (CDN) + Tailwind (CDN) + localStorage

## Environment Variables

Required in `.env.local` and Vercel dashboard:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret API key (`sb_secret_...` format) — used by admin client to bypass RLS |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `CRON_SECRET` | Bearer token for Vercel Cron route auth |
| `RESEND_WEBHOOK_SECRET` | Shared secret for verifying Resend webhook callbacks (optional — falls back to svix-id header) |
| `AFFILIATE_WEBHOOK_SECRET` | Bearer token for authenticating affiliate purchase postbacks |

## File Map

```
projectlandmarks/
├── src/
│   ├── app/
│   │   ├── (admin)/                  Admin route group (is_admin gated, separate sidebar)
│   │   │   ├── admin/page.tsx        Analytics dashboard (KPIs, funnel, breakdowns)
│   │   │   ├── admin/queue/page.tsx  Email queue + custom message editor
│   │   │   ├── admin/gifts/page.tsx  Gift catalog CRUD
│   │   │   └── layout.tsx
│   │   ├── (app)/                    Protected route group (shared sidebar layout)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── contacts/page.tsx
│   │   │   ├── contacts/[id]/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (onboarding)/             Isolated layout (no sidebar)
│   │   │   ├── onboarding/page.tsx
│   │   │   └── layout.tsx
│   │   ├── about/page.tsx            About page (origin story, privacy, revenue model)
│   │   ├── privacy/page.tsx          Privacy Policy (11 sections, plain English)
│   │   ├── terms/page.tsx            Terms of Service (15 sections)
│   │   ├── contact/page.tsx          Contact form (client-side, posts to /api/contact)
│   │   ├── auth/
│   │   │   ├── page.tsx              Sign in / sign up
│   │   │   ├── callback/route.ts     Supabase auth callback
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── api/
│   │   │   ├── cron/reminders/route.ts   Daily reminder emails (Vercel Cron)
│   │   │   ├── cron/digest/route.ts      Monthly digest (1st of month)
│   │   │   ├── cron/reengagement/route.ts  Re-engagement drip (daily)
│   │   │   ├── test-email/route.ts       DEV ONLY — must remove/lock before launch
│   │   │   └── webhooks/
│   │   │       ├── resend/route.ts      Resend delivery/open/click webhooks → conversion_events
│   │   │       └── affiliate/route.ts   Affiliate purchase postbacks → conversion_events
│   │   │   └── contact/route.ts         Contact form → sends email via Resend
│   │   ├── layout.tsx                Root layout (Inter via next/font, SEO metadata)
│   │   ├── page.tsx                  Landing page (full marketing: hero, mockup, how-it-works, comparison, CTA, privacy promise)
│   │   └── globals.css
│   ├── components/
│   │   ├── sidebar.tsx               Shared sidebar nav (user-facing pages)
│   │   ├── admin-sidebar.tsx         Admin sidebar nav (dashboard, queue, gifts)
│   │   ├── marketing-nav.tsx         Fixed top nav for public pages (logo + sign in/get started)
│   │   ├── marketing-footer.tsx      Dark footer for public pages (links to about, privacy, terms, contact)
│   │   └── email-verification-banner.tsx
│   ├── emails/
│   │   ├── reminder.tsx              React Email — gift reminder template
│   │   ├── digest.tsx                React Email — monthly digest template
│   │   └── reengagement.tsx          React Email — D+3/D+10/D+30 drip templates
│   ├── lib/
│   │   ├── supabase/admin.ts         Admin client (service_role, bypasses RLS)
│   │   ├── supabase/client.ts        Browser client
│   │   ├── supabase/server.ts        Server-side client (cookie-based sessions)
│   │   ├── email-config.ts           From/replyTo, compliance headers, reminder windows
│   │   ├── gift-engine.ts            Weighted scoring engine: scoreGift() + selectGiftsScored()
│   │   ├── reminders.ts              Shared reminder logic: date math, window matching, idempotency, send caps, rate-limit detection
│   │   ├── resend.ts                 Resend client instance
│   │   └── utils.ts                  Shared utilities
│   └── middleware.ts                 Auth guard: protects /dashboard, /contacts, /settings, /onboarding; redirects unauthed → /auth
├── supabase/migrations/
│   ├── 001_initial_schema.sql        Core tables: profiles, contacts, events, reminder_log, shown_gifts, gift_catalog
│   ├── 002_add_drips_sent.sql        Adds profiles.drips_sent JSONB for re-engagement tracking
│   ├── 003_email_resilience.sql      Adds 'pending'/'deferred' to reminder_log.status; index for per-user daily send cap
│   ├── 004_seed_gift_catalog.sql     ~30 sample gifts across all categories/tiers with affinities + tags
│   └── 005_email_overrides.sql       email_overrides table for admin custom messages per reminder slot
├── vercel.json                       Cron schedules (all UTC)
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── Landmarks_Technical_Architecture.docx
├── Landmarks_Competitive_Assessment.docx
├── Landmarks_Go_Live_Plan.docx
├── Landmarks_Production_Migration_Plan.docx
└── [legacy prototype files]          *.html, js/*.js — kept for reference, not active development
```

## Architecture Notes (Production)

**Data layer:** Supabase Postgres with RLS. Core tables: `profiles`, `contacts`, `events`, `reminder_log`, `shown_gifts`, `gift_catalog`. The admin client (`src/lib/supabase/admin.ts`) uses the service_role key to bypass RLS for cron jobs. Browser and server clients use the anon key with RLS enforced.

**Soft-delete (contacts):** `deleted_at` timestamp as trash flag with 7-day expiry. All queries filter out trashed contacts automatically. Production needs a Vercel Cron job for `purgeExpired()` — not yet implemented.

**Route groups:** `(app)` wraps all authenticated pages with shared sidebar layout. `(onboarding)` has its own layout (no sidebar). This isolates the onboarding flow from the main app chrome.

**Middleware (`src/middleware.ts`):** Creates Supabase SSR client for cookie-based sessions. Protects `/dashboard`, `/contacts`, `/settings`, `/onboarding`, `/admin` — redirects unauthenticated users to `/auth`. Redirects authenticated users away from `/auth` (except `/auth/reset-password` to allow password reset links).

**Auth:** Supabase Auth with bcrypt + session tokens. Email verification via Supabase's built-in flow. Password recovery via `/auth/forgot-password` → Supabase reset email → `/auth/reset-password`. Reminder emails **must** be gated on `email_confirmed_at` — no reminders, digests, or re-engagement emails to unverified addresses. This is a legal requirement (GDPR, CAN-SPAM, California anti-spam) because emails contain affiliate links (commercial). The cron route already filters on `email_confirmed_at` (see `verifiedUsers` filter in `route.ts`).

**Email system:** Three cron routes send emails via Resend using React Email templates. Reminders check each verified user's events against reminder windows (21/7/3 days), select gifts from `gift_catalog`, send via Resend, and log to `reminder_log` + `shown_gifts`. Digest sends a monthly summary. Re-engagement sends D+3/D+10/D+30 drip emails to users with zero contacts, tracked via `profiles.drips_sent` JSONB (not `reminder_log`, which has FK constraints on `event_id`/`contact_id`).

**Gift selection (`src/lib/gift-engine.ts`):** Deterministic weighted scoring engine. Fetches active gifts matching the contact's categories (broadened to include any last-minute item when ≤2 days out), scores each candidate against: category match (+40), budget tier match (+20), relationship affinity (+15), event affinity (+15), tag overlap with contact's free-text `gift_other` (+3/tag), last-minute bonus/penalty (±10–20), repeat penalty (−25 per prior showing from `shown_gifts`), and seeded shuffle jitter (0–9, deterministic per contact+year). Returns top 3. No LLM — per-query cost is zero. See `scoreGift()` for the pure function; `selectGiftsScored()` for the full pipeline. Seed data in migration 004.

**Admin panel (`src/app/(admin)/`):** Separate route group with its own layout and sidebar. Access gated server-side: `(admin)/layout.tsx` checks `profiles.is_admin` via Supabase and redirects non-admins to `/dashboard`. Three pages: analytics dashboard (KPI cards, conversion funnel, partner/category/lead-time breakdowns from `conversion_events`), email queue (upcoming 21-day reminders with expandable rows for per-slot custom message editing via `email_overrides` table), and gift catalog CRUD (inline add/edit form, category filters, activate/deactivate toggles). Admin custom messages are injected into reminder emails by the cron route — queried from `email_overrides` keyed on `(user_id, event_id, days_before, event_year)`, passed to the React Email template as `customMessage` prop, rendered as a styled "A note from Daysight" block between the intro and gift suggestions.

**Webhooks:** Two POST endpoints populate `conversion_events` for analytics. `/api/webhooks/resend` receives Resend delivery events (delivered/opened/clicked/bounced), updates `reminder_log.status`, and inserts opened/clicked into `conversion_events`. `/api/webhooks/affiliate` receives affiliate purchase postbacks with commission data, inserts a `purchased` event. Both authenticate via bearer tokens (env vars `RESEND_WEBHOOK_SECRET`, `AFFILIATE_WEBHOOK_SECRET`).

## Email Resilience

All cron routes (`reminders`, `digest`, `reengagement`) implement resilience against outages, rate limits, and backlog floods. Core logic lives in `src/lib/reminders.ts`; routes import from there. Migration `003_email_resilience.sql` adds DB support.

**Five mechanisms:**

1. **Pre-send logging.** Before calling Resend, insert a `reminder_log` row with `status='pending'`. On success → update to `'sent'` + set `resend_id`. On failure → update to `'failed'`. On rate limit → update to `'deferred'`. This eliminates the window where an email is sent but untracked (previously: send first, log second — if the log insert failed, dedup couldn't catch the duplicate). The unique index on `(user_id, event_id, days_before, event_date)` also acts as a race-condition guard: a duplicate `pending` insert hits a 23505 constraint violation and is skipped.

2. **Idempotency keys.** Every Resend call includes an `Idempotency-Key` header: `ds-{userId}-{eventId}-{canonicalDaysBefore}-{eventDateStr}`. If our code calls Resend twice for the same reminder (timeout retry, cron overlap), Resend deduplicates server-side.

3. **Range-based window matching.** Old: `daysUntil === 7` (exact). New: `daysUntil` maps to a range (5–7 → canonical 7, 1–3 → canonical 3, 19–21 → canonical 21 for high-importance). If cron misses the exact day (outage, Vercel cold start failure), the next run within ±2 days still catches it. Dedup uses the canonical value so a reminder caught at 6 days logs as `days_before=7` and won't re-send at 5. Function: `matchReminderWindow()`.

4. **Per-user send cap.** Before processing a user's events, count `reminder_log` rows with `status in ('sent','delivered','opened','clicked')` in the last 24h. If ≥ `MAX_EMAILS_PER_USER_PER_DAY` (currently 3), defer that user entirely. Also checked mid-loop so a user with many events doesn't get 10 emails in one run. This prevents post-outage floods where a user has multiple events that all fell into range simultaneously.

5. **429 handling.** All three cron routes check `isRateLimitError()` after every Resend call. On 429: the current reminder is marked `'deferred'`, `results.rateLimited = true`, and the outer user loop breaks immediately. No further Resend calls are attempted. The deferred items will be retried on the next cron run (range-based matching ensures they're still in window).

**Backlog scenario walkthrough:** Cron is down for 2 days. On day 3 it runs. For each user: events that were at 7 days are now at 5 (still in 5–7 range → sends as canonical 7). Events that were at 3 days are now at 1 (still in 1–3 range → sends as canonical 3). The per-user cap of 3 prevents more than 3 emails going out. Excess events are deferred to the next day's run. No user gets a flood.

**What is NOT covered:** Digest and re-engagement routes don't use pre-send logging (no `reminder_log` involvement — digest has no dedup table, re-engagement uses `drips_sent` JSONB). They do have 429 handling. If Resend is fully down for >2 days, events that fall outside the ±2 day range are permanently missed — an acceptable tradeoff vs. sending a "7-day reminder" when the event is tomorrow.

## Architecture Notes (Prototype — Legacy Reference)

**Data layer (`js/store.js`):** IIFE returning a `Store` object with namespaced modules (`auth`, `profile`, `contacts`, `events`, `reminders`, etc.). All reads/writes via localStorage with JSON serialization. Schema mirrors Supabase tables.

**Page architecture:** Each HTML file is self-contained — loads Alpine.js + Tailwind from CDN, imports `store.js`, defines its own Alpine component function. No shared component library; sidebar, signOut, initials computation duplicated per page.

**Admin panel (`admin.html`):** Seeds 60 days of randomized conversion funnel data for demo. Superseded by production admin panel in `src/app/(admin)/` (Phase 7).

## What's Working

### Production (Next.js)
- Full auth flow: sign up → email verification → onboarding → dashboard → sign out → sign in
- Password recovery: `/auth/forgot-password` → Supabase reset email → `/auth/reset-password`
- Supabase Auth with session management via middleware
- Contact CRUD with search, filter by relationship, high-importance flag
- Event management (birthday, anniversary, custom) with month/day
- Upcoming reminders sorted by proximity with urgency color coding
- Dashboard stats (contact count, events tracked, urgent count)
- Settings (display name, timezone, reminder prefs)
- Shared sidebar component (`src/components/sidebar.tsx`)
- Email verification banner on authenticated pages
- Real email sending via Resend — reminder, digest, and re-engagement templates
- Vercel Cron jobs: daily reminders, monthly digest, daily re-engagement drip
- Gift selection via weighted scoring engine (category, budget, relationship/event affinity, tags, repeat penalty, seeded shuffle)
- Reminder dedup via `reminder_log` with pre-send pending status
- Email resilience: range-based windows, idempotency keys, per-user send caps, 429 handling
- Shown-gift tracking via `shown_gifts` table ("Last year we suggested..." line)
- Contact soft-delete with `deleted_at` timestamp
- Sensitive-event flag: `suppress_gifts` boolean — email shows warm gift-free message
- About page
- Admin panel: analytics dashboard (KPIs, conversion funnel, partner/category/lead-time breakdowns), email queue with per-reminder custom message editor, gift catalog CRUD
- Admin custom messages in reminder emails (stored in `email_overrides`, rendered as "A note from Daysight" block)
- Webhook routes: Resend delivery events → `reminder_log` status + `conversion_events`; affiliate postbacks → `conversion_events` with commission
- Full marketing landing page (hero with email mockup, how-it-works, comparison, CTA, privacy promise, revenue model)
- About, Privacy Policy, Terms of Service, Contact pages
- Contact form with API route (POST /api/contact → Resend)
- Shared marketing nav and footer components

### Prototype (legacy HTML — feature-complete reference)
- All of the above plus: gift category preferences UI, budget tiers, cookie consent, admin panel, email preview dev tool, .ics calendar feed, data export, account deletion with cascade, recycling bin with countdown badges, Settings tabs (General/Password/Recycling Bin)
- These features exist in prototype only and need porting in Phases 6–9 or the UI conformity sweep

## Known Limitations

- ~~No real email sending~~ ✅ Resolved in Phase 5. Resend + React Email templates + Vercel Cron.
- ~~No cron/scheduled jobs~~ ✅ Resolved in Phase 5. Three cron routes in `vercel.json`.
- ~~No password recovery~~ ✅ Resolved. Supabase Auth reset flow via `/auth/forgot-password`.
- No Google OAuth (button visually disabled with "coming soon" label in prototype)
- Affiliate links are placeholder URLs — no real affiliate program connected yet
- ~~No contact-us backend~~ ✅ Resolved in Phase 8. Contact form at `/contact` with API route via Resend.
- No contact import (CSV, Google Contacts, vCard)
- ~~Gift selection is basic filter~~ ✅ Resolved in Phase 6. Weighted scoring engine with affinity matching, repeat avoidance, and seeded variety.
- ~~No cron-side rate-limit handling~~ ✅ Resolved. All three cron routes detect Resend 429 and stop processing. Per-user send cap (3/day) prevents post-outage floods. See § Email Resilience.
- **No user-facing rate-limit handling for auth.** Supabase free tier throttles auth emails (3–4/hour). Catch HTTP 429 from Supabase Auth on sign-up/password-reset pages and show a friendly message.
- **No automated tests.** Need at minimum: unit tests for reminder date math/timezone handling, integration tests for auth + onboarding flow.
- **UI conformity sweep needed.** Significant visual drift between prototype and Next.js pages: emoji placeholders vs SVG icons, simplified button treatments, missing inline validation, copy differences, missing secondary features (notes field, multiple events in onboarding, etc.). Deferred to post-Phase 9.
- **`/api/test-email` route must be removed or locked down before production launch.** Protected by CRON_SECRET in prod, open in dev.

## Remaining Migration Work

**Phase 6 — Gift recommendation engine:** ✅ Complete. `src/lib/gift-engine.ts` implements deterministic weighted scoring. Seed data in migration 004. See § Gift selection in Architecture Notes for weight breakdown.

**Phase 7 — Admin panel:** ✅ Complete. Analytics dashboard, email queue with custom message editor, gift catalog CRUD, Resend + affiliate webhook routes. Data flows: Resend webhooks → `conversion_events` (opened/clicked) + `reminder_log` status updates; affiliate postbacks → `conversion_events` (purchased + commission). Admin custom messages stored in `email_overrides`, fetched by cron route and injected into reminder email template.

**Phase 8 — Marketing pages:** ✅ Complete. Full landing page (hero, email mockup, 3-step how-it-works, Google Calendar vs Daysight comparison, CTA banner, privacy promise, revenue model), About page, Privacy Policy (11 sections, CCPA+GDPR), Terms of Service (15 sections), Contact page with form (POST /api/contact via Resend). Shared marketing-nav and marketing-footer components. Root layout updated with `next/font/google` for Inter and SEO metadata. Prose styling via `prose-daysight` CSS class in globals.css.

**Phase 9 — Testing, polish, go-live:** Automated tests, error boundaries, input sanitization, rate-limit handling, UI conformity sweep, remove `/api/test-email`, production readiness.

**`next-app/` deleted:** Was a Phase 0 leftover causing build conflicts. Do not recreate.

## Key Files to Understand First

If you're picking this up cold, read in this order:
1. This file (`CLAUDE.md`)
2. `src/app/api/cron/reminders/route.ts` — the core business logic (event matching, gift selection, email sending)
3. `src/emails/reminder.tsx` — what the product actually delivers
4. `src/lib/email-config.ts` — email config + reminder windows
5. `src/middleware.ts` — auth routing logic
6. `supabase/migrations/001_initial_schema.sql` — the data model
7. `Landmarks_Competitive_Assessment.docx` — competitive landscape and positioning

For prototype reference (legacy):
- `js/store.js` — original data model and business logic
- `dashboard.html` — original core UX
- `email-preview.html` — original email preview dev tool

## Conventions

- All dates stored as month (1-12) + day (1-31), not full Date objects
- UUIDs via Supabase (Postgres `gen_random_uuid()`); prototype used `crypto.randomUUID()` with fallback
- Tailwind brand color palette: orange-warm (primary `brand-600` = `#d05a32`, email hex `brandOrange`)
- Urgency thresholds: 0-3 days = urgent (red), 4-7 = soon (orange), 8+ = upcoming (green)
- **Auth security — no information leakage:** Sign-in errors must always show generic "Invalid email or password." regardless of whether email exists or password is wrong. Only sign-up form may show password requirements.
- **Auth security — duplicate email prevention:** Supabase returns a user with empty `identities` array when email is already registered; detect this and show generic error ("Unable to create account. Please try signing in instead.").
- **Domain:** `daysight.xyz`

## API Routes

| Route | Method | Trigger | Auth | Description |
|---|---|---|---|---|
| `/api/cron/reminders` | GET | Vercel Cron daily 12:00 UTC | `Bearer CRON_SECRET` | Sends reminder emails for events within range-based 21/7/3-day windows (see § Email Resilience) |
| `/api/cron/digest` | GET | Vercel Cron 1st of month 14:00 UTC | `Bearer CRON_SECRET` | Monthly digest for users with upcoming events |
| `/api/cron/reengagement` | GET | Vercel Cron daily 13:00 UTC | `Bearer CRON_SECRET` | D+3/D+10/D+30 drip for users with zero contacts |
| `/api/test-email` | GET | Manual | CRON_SECRET in prod | DEV ONLY — sends test reminder email |
| `/api/webhooks/resend` | POST | Resend webhook | `RESEND_WEBHOOK_SECRET` or svix-id | Updates reminder_log status + inserts opened/clicked into conversion_events |
| `/api/webhooks/affiliate` | POST | Affiliate partner | `Bearer AFFILIATE_WEBHOOK_SECRET` | Inserts purchased event with commission into conversion_events |
| `/api/contact` | POST | Contact form | None (public) | Forwards contact form submission via Resend to hello@daysight.xyz |
| `/auth/callback` | GET | Supabase redirect | — | Handles OAuth/magic-link callbacks, exchanges code for session |

## Supabase Schema (Core Tables)

`profiles` — user profile (display_name, timezone, preferred_send_hour, drips_sent JSONB)
`contacts` — contact records (first_name, last_name, relationship, gift_categories, budget_tier, deleted_at for soft-delete)
`events` — dates to track (event_type, month, day, high_importance, suppress_gifts, contact_id FK, user_id denormalized)
`reminder_log` — dedup + history (user_id, event_id, contact_id, days_before, event_date, resend_id, status [`pending`→`sent`/`failed`/`deferred`], gift_ids)
`shown_gifts` — what gifts were shown per reminder (for "last year we suggested" line and avoiding repeats)
`gift_catalog` — affiliate gift items (name, category, partner, price_tier, tags, affiliate_url, is_active, is_last_minute)
`email_overrides` — admin custom messages per reminder slot (user_id, event_id, days_before, event_year, custom_message, created_by). Unique on (user_id, event_id, days_before, event_year).
`conversion_events` — analytics funnel (reminder_id, user_id, event_type [opened/clicked/purchased], partner, gift_category, reminder_lead, commission). Populated by Resend + affiliate webhooks.

Migrations in `supabase/migrations/`. **Never append to already-executed migration files** — Supabase won't re-run them. Use standalone SQL in the SQL editor.

## Session Learnings & Gotchas (Phases 5–9)

**Build:**
- TypeScript strict mode on Vercel catches errors `next dev` misses (implicit `any`, missing Suspense). Always run `npm run build` locally before pushing.
- `useSearchParams()` requires a `<Suspense>` boundary in Next.js 14 production builds. Any page using it needs wrapping.

**Packages:**
- Use individual `@react-email/*` packages (`@react-email/html`, `@react-email/head`, etc.). The unified `react-email` is a heavy CLI (esbuild, socket.io, tailwindcss v4). `@react-email/components` is deprecated.

**Supabase:**
- Secret API keys (`sb_secret_...`) replace `service_role` keys — drop-in. Stored as `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars.
- Re-engagement drip tracking uses `profiles.drips_sent` JSONB (migration 002), NOT `reminder_log` (FK constraints on `event_id`/`contact_id` don't apply to drip emails).

**Email design:**
- Use pixels only — email clients have inconsistent support for rem/em/%/viewport units. Responsiveness via `width: 100%` + `max-width` on container + stacked layouts.
- Gift cards use stacked layout (button below description, not beside). `inline-block` button (not `block`) to avoid oversized buttons on desktop.
- `Precedence: bulk` header removed — it was signaling Gmail to classify as Promotions. Not appropriate for low-volume personal reminders.
- Emails will likely land in Gmail Promotions tab regardless (affiliate links = commercial). Mitigations: low link count, sender reputation building, users can drag to Primary.

**Dev tools & security:**
- `/api/test-email` route exists for dev. Must be removed or locked behind auth before production launch. Protected by CRON_SECRET in prod, open in dev.
- Vercel deployment protection blocks unauthenticated API requests on preview deployments. Use `npx vercel curl` or test locally.
- Cron schedules in `vercel.json` are UTC: reminders daily 12:00, digest 1st of month 14:00, re-engagement daily 13:00. Adjust based on user timezone distribution post-launch.

**Email resilience:**
- `nextOccurrence()` and `formatEventDate()` were duplicated in reminders + digest routes — now shared via `src/lib/reminders.ts`. Never re-duplicate; import from there.
- Resend supports `Idempotency-Key` header. Our keys are deterministic (`ds-{userId}-{eventId}-{days}-{date}`). If you add new email-sending code, always include one.
- `reminder_log` unique index on `(user_id, event_id, days_before, event_date)` serves double duty: dedup check AND race-condition guard (parallel cron invocations). Catch Postgres error code `23505` and treat as "already handled."
- Range-based window matching (±2 days) means a cron outage of up to 2 days is self-healing. Outages >2 days cause permanent misses for events that fall outside all ranges — acceptable tradeoff.
- Per-user cap is checked both before the event loop AND inside it (a user may have multiple events). The `userSendsThisRun` counter tracks within-run sends that haven't been committed to DB yet.
