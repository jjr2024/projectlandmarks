# CLAUDE.md — Landmarks

## Project Status

**This is a localhost prototype.** Everything runs in the browser with no backend, no build step, and no network calls. The goal is to validate the UI/UX, data model, and email design before migrating to a production stack. The prototype is not deployed anywhere and is not intended for public use in its current form.

The production migration path is: vanilla HTML/Alpine.js/localStorage → Next.js + Supabase + Resend + Vercel Cron. The localStorage data layer (`js/store.js`) was designed so its API maps 1:1 to the planned Supabase schema, making the swap mechanical rather than architectural.

## What Landmarks Is

An email-first birthday and gift reminder service for busy professionals. Users enter contacts and key dates once, pick gift preferences, and receive timely reminder emails with curated affiliate gift links. Free to the user; revenue comes from affiliate commissions on purchases made through those links.

Core insight: calendar reminders tell you a birthday is coming — Landmarks tells you what to do about it.

## Quick Start

No install, no dependencies, no build step.

```
open index.html                      # macOS
python3 -m http.server 3000         # or serve locally at localhost:3000
```

Demo account: `demo@landmarks.app` / `demo1234` (seeded on first load if no users exist).
Admin panel: `admin.html` — credentials `admin@landmarks.app` / `LM-admin-2026!` (not linked from public nav).

## Tech Stack (Prototype)

- **HTML5** — static pages, no build step
- **Alpine.js** — lightweight reactivity via CDN
- **Tailwind CSS** — utility classes via CDN
- **localStorage** — all persistence (cleared = full reset)

## Tech Stack (Production Target)

- **Next.js on Vercel** — frontend + API routes
- **Supabase** — Postgres + Auth + Row-Level Security
- **Resend** — transactional email delivery
- **Vercel Cron** — scheduled reminder jobs

## File Map

```
projectlandmarks/
├── index.html              Landing page (marketing, cookie consent, auth redirect)
├── auth.html               Sign in / sign up (email+password, demo shortcut)
├── onboarding.html         Post-signup guided setup (4 steps)
├── dashboard.html          Upcoming reminders, stats, urgency badges
├── contacts.html           Contact list with search/filter, add/edit/delete modals
├── contact.html            Single contact detail + event management
├── settings.html           Profile, reminder timing, gift defaults, data export, account deletion
├── email-preview.html      DEV TOOL: live preview of reminder emails with gift data
├── admin.html              Internal admin dashboard (conversion funnel, partner metrics)
├── contact-us.html         Contact form (frontend only, backend not wired)
├── privacy.html            Privacy policy (static)
├── terms.html              Terms of service (static)
├── js/
│   ├── store.js            Data layer — all CRUD, auth, reminders, conversion tracking, utils
│   └── email-config.js     Email infra config (DNS records, headers, warmup schedule, thresholds)
├── Landmarks_Blueprint.md  Full product + technical blueprint (business model, schema, timeline)
├── Competitive_Assessment.md  Competitive landscape analysis
├── Todos.md                Prioritized feature roadmap (Tier 0–3)
└── README.md               Quick start and feature summary
```

## Architecture Notes

**Data layer (`js/store.js`):** An IIFE that returns a `Store` object with namespaced modules: `auth`, `profile`, `contacts`, `events`, `reminders`, `scheduler`, `conversion`, `admin`, `seed`, `utils`. Every page imports this single file. All reads/writes go through `localStorage` with JSON serialization. The schema mirrors the planned Supabase tables (profiles, contacts, events, reminder_log) plus prototype-only additions (conversion_events, admin_session).

**Page architecture:** Each HTML file is self-contained — loads Tailwind + Alpine from CDN, imports `store.js`, defines its own Alpine component as a function (e.g., `dashboardApp()`, `contactsApp()`). Pages share no component library; common patterns (sidebar nav, signOut, initials computation) are duplicated per page. This is acceptable for a prototype but should be componentized during production migration.

**Navigation flow:**
```
index.html → auth.html → onboarding.html (new users) → dashboard.html
                        → dashboard.html (returning users)
dashboard.html ↔ contacts.html ↔ contact.html
dashboard.html ↔ settings.html
dashboard.html ↔ email-preview.html
admin.html (standalone, not linked from public nav)
```

**Auth model:** Plaintext passwords in localStorage. Acceptable for a local prototype. Must be replaced by Supabase Auth (bcrypt + sessions) before any deployment.

**Email preview (`email-preview.html`):** Contains hardcoded `GIFT_DATA` and `GIFT_DATA_LASTMINUTE` objects (~100 lines of gift catalog data). This is the closest thing to "what the product actually recommends." In production, this data should come from affiliate partner APIs or an LLM curation layer.

**Admin panel (`admin.html`):** Seeds 60 days of randomized conversion funnel data for demo purposes. Shows KPI cards, funnel visualization, partner/category breakdowns, daily trends, and a deliverability checklist. Production version would read from a `conversion_events` Postgres table populated by Resend webhooks and affiliate postbacks.

## What's Working

- Full auth flow (sign up → onboarding → dashboard → sign out → sign in)
- Contact CRUD with search, filter by relationship, high-importance flag
- Event management (birthday, anniversary, custom) with month/day, optional year, one-time flag
- Gift category preferences (per-contact or global default), budget tiers
- Upcoming reminders sorted by proximity with urgency color coding
- Dashboard stats (contact count, events tracked, urgent count)
- Settings (display name, timezone, reminder timing chip picker, send hour, monthly digest toggle, data export, account deletion)
- Email preview with contact/event/gift swapping and scheduled send time display
- Admin conversion funnel with seeded demo data
- Cookie consent banner with customization modal

## Known Limitations

- No real email sending — email-preview.html shows what would be sent
- No Google OAuth (button shows "coming soon")
- No cron/scheduled jobs — reminder logic is frontend-computed
- No password recovery
- Affiliate links are placeholder alerts
- Contact form (contact-us.html) has no backend — `send()` only updates UI state
- No contact import (CSV, Google Contacts, vCard)
- Gift "curation" is a static lookup table, not LLM-driven recommendations

## Structural Critique & Migration Notes

**What's solid:**
- The data schema is well-designed and maps cleanly to Postgres. Four core tables (profiles, contacts, events, reminder_log) with sensible fields, a denormalized `user_id` on events for query efficiency, and cascade-delete on contacts→events.
- The Store API design is clean — namespaced, consistent return shapes (`{ contact }` / `{ error }`), and the interface can be swapped to Supabase client calls without changing the calling code.
- Documentation is thorough. The blueprint, competitive assessment, and prioritized todo list are unusually well-thought-out for a prototype.
- The email-config.js file is production-ready documentation of DNS records, compliance headers, and warmup schedules.
- The admin panel with conversion funnel tracking shows the right metrics mindset.

**What needs work before production:**
- **No component reuse.** Every page re-implements sidebar nav, signOut(), initials getter, auth guards, and utility formatting. During the Next.js migration, extract these into shared components/hooks.
- **Gift data is hardcoded in HTML.** The `GIFT_DATA` object in email-preview.html should move to a config file or API. In production, this becomes the LLM curation layer (Todos.md item 0.1 — the single most important feature gap).
- **Cookie consent logic is standalone.** The `COOKIE_KEY` and cookie functions in index.html should be centralized in store.js or a dedicated module.
- **No input sanitization.** The prototype trusts all input. Production must sanitize server-side before DB insertion.
- **No error boundaries.** If Store calls fail silently, pages may render in broken states. Production needs proper error handling and user-facing error states.
- **contact-us.html form is non-functional.** Needs a backend (Formspree, Resend, or a Next.js API route).
- **CSS is repeated across every file.** Common styles (`.sidebar-link`, `.badge-urgent/soon/upcoming`, `.gradient-text`) are copy-pasted. Extract to a shared stylesheet or Tailwind plugin during migration.
- **No tests.** README has a manual QA checklist but no automated tests. Production should have at minimum: unit tests for Store logic (especially reminder date math and timezone handling), and integration tests for the auth + onboarding flow.
- **Sensitive-event handling missing (Todos.md 0.6).** No `suppress_gifts` flag on events. This is a pre-launch blocker — a reminder email trying to sell gifts for a death anniversary is a reputational catastrophe.

## Key Files to Understand First

If you're picking this up cold, read in this order:
1. `js/store.js` — the entire data model and business logic
2. `dashboard.html` — the core user experience
3. `email-preview.html` — what the actual product delivers (the reminder email)
4. `Todos.md` — what's missing and in what priority order
5. `Landmarks_Blueprint.md` — full context on the business model and technical plan

## Conventions

- All dates stored as month (1-12) + day (1-31), not full Date objects
- UUIDs via `crypto.randomUUID()` with fallback polyfill
- Alpine.js components defined as top-level functions per page (e.g., `dashboardApp()`)
- Tailwind brand color palette: orange-warm (`brand-50` through `brand-900`, primary `brand-600` = `#d05a32`)
- Urgency thresholds: 0-3 days = urgent (red), 4-7 = soon (orange), 8+ = upcoming (green)
- Demo data seeded via `Store.seed.run()` on landing page load (only if no users exist)
