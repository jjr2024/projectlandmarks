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
├── index.html              Landing page (marketing, privacy promise, cookie consent, auth redirect)
├── auth.html               Sign in / sign up (email+password, demo shortcut)
├── onboarding.html         Post-signup guided setup (4 steps: welcome, contact+events, gift prefs, done)
├── dashboard.html          Upcoming reminders, stats, urgency badges
├── contacts.html           Contact list with search/filter, add/edit/delete modals
├── contact.html            Single contact detail + event management
├── settings.html           Profile, reminder timing, gift defaults, data export, account deletion
├── email-preview.html      DEV TOOL: live preview of reminder emails with gift data
├── admin.html              Internal admin dashboard (two tabs: analytics funnel + email queue with gift overrides)
├── about.html              Origin story, privacy philosophy, business model
├── contact-us.html         Contact form (frontend only, backend not wired)
├── privacy.html            Privacy policy (static)
├── terms.html              Terms of service (static)
├── js/
│   ├── store.js            Data layer — all CRUD, auth, reminders, conversion tracking, adminQueue, utils
│   ├── gift-data.js        Shared gift catalog (GIFT_DATA + GIFT_DATA_LASTMINUTE), used by email-preview and admin
│   └── email-config.js     Email infra config (DNS records, headers, warmup schedule, thresholds)
├── Landmarks_Technical_Architecture.docx   Technical architecture documentation (data model, Store API, conventions, tech debt)
├── Landmarks_Competitive_Assessment.docx   Competitive landscape analysis and strategic takeaways
└── Landmarks_Go_Live_Plan.docx             Phased production migration plan (Phase 1: launch, Phase 2: post-launch, Phase 3: future)
```

## Architecture Notes

**Data layer (`js/store.js`):** An IIFE that returns a `Store` object with namespaced modules: `auth`, `profile`, `contacts`, `events`, `reminders`, `scheduler`, `conversion`, `admin`, `adminQueue`, `seed`, `utils`, `calendar`. Every page imports this single file. All reads/writes go through `localStorage` with JSON serialization. The schema mirrors the planned Supabase tables (profiles, contacts, events, reminder_log) plus prototype-only additions (conversion_events, admin_session).

**Page architecture:** Each HTML file is self-contained — loads Tailwind + Alpine from CDN, imports `store.js`, defines its own Alpine component as a function (e.g., `dashboardApp()`, `contactsApp()`). Pages share no component library beyond `store.js` and `gift-data.js`; common patterns (sidebar nav, signOut, initials computation) are duplicated per page. This is acceptable for a prototype but should be componentized during production migration.

**Mobile sidebar pattern:** All authenticated pages (dashboard, contacts, contact, settings, email-preview) implement a responsive sidebar that collapses behind a hamburger button on screens below the `md` breakpoint. Each page manages this via an Alpine.js `sidebarOpen` boolean, a fixed-position sidebar with CSS transform (`-translate-x-full` when closed), and a semi-transparent overlay. The pattern is duplicated per page — same implementation, no shared component.

**Navigation flow:**
```
index.html → auth.html → onboarding.html (new users) → dashboard.html
                        → dashboard.html (returning users)
dashboard.html ↔ contacts.html ↔ contact.html
dashboard.html ↔ settings.html
dashboard.html ↔ email-preview.html
about.html (linked from index.html footer + all authenticated page sidebars)
admin.html (standalone, not linked from public nav)
```

**Auth model:** Plaintext passwords in localStorage. Acceptable for a local prototype. Must be replaced by Supabase Auth (bcrypt + sessions) before any deployment.

**Email preview (`email-preview.html`):** Imports `GIFT_DATA` and `GIFT_DATA_LASTMINUTE` from the shared `js/gift-data.js` file (~100 lines of gift catalog data). This is the closest thing to "what the product actually recommends." In production, this data moves to a structured `gift_catalog` table with tags, relationship/event affinities, and price tiers, and items are selected by a deterministic weighted scoring function (see Go-Live Plan Phase 1.4). No LLM — per-query cost must be zero for a free affiliate-funded service.

**Admin panel (`admin.html`):** Seeds 60 days of randomized conversion funnel data for demo purposes. Shows KPI cards, funnel visualization, partner/category breakdowns, daily trends, and a deliverability checklist. Production version would read from a `conversion_events` Postgres table populated by Resend webhooks and affiliate postbacks.

## What's Working

- Full auth flow (sign up → onboarding → dashboard → sign out → sign in)
- Contact CRUD with search, filter by relationship, high-importance flag
- Event management (birthday, anniversary, custom) with month/day, optional year, one-time flag
- Gift category preferences (per-contact or global default), budget tiers
- Upcoming reminders sorted by proximity with urgency color coding
- Dashboard stats (contact count, events tracked, urgent count)
- Settings (display name, timezone, reminder timing chip picker, send hour 6AM–9PM, monthly digest toggle, data export, account deletion with cascade warning)
- Email preview with contact/event/gift swapping and scheduled send time display
- Admin conversion funnel with seeded demo data, email queue with gift override capability
- Cookie consent banner with customization modal
- Mobile-responsive sidebar on all authenticated pages (hamburger toggle, overlay, collapses below `md` breakpoint)
- Form validation: month-aware day dropdowns, required custom event labels, disabled submit on empty required fields, email preserved across auth mode toggles
- Dead UI elements cleaned up: "Forgot password?" replaced with informative text, Google OAuth button visually disabled, contact-us form shows prototype notice
- Landing page privacy section: dedicated 3-card block (no data selling, encryption, delete anytime), strengthened "how we make money" copy, trust badges in CTA
- Sensitive-event flag: `suppress_gifts` boolean on events, subtle checkbox on event forms ("Skip gift suggestions"), email preview shows warm gift-free message when active
- Monthly conditional digest: only sent when user has events in next 30 days (no empty emails), toggle in settings, preview in email-preview.html digest tab
- Read-only .ics calendar feed: `Store.calendar.generateICS()` generates standard iCalendar with RRULE for recurring events, download button and feed URL copy in Settings
- Privacy messaging on authenticated pages: "We never contact the people you add" on contacts page, "Your data stays private" on onboarding, "Your data is yours — export or delete anytime" on dashboard

## Known Limitations

- No real email sending — email-preview.html shows what would be sent
- No Google OAuth (button visually disabled with "coming soon" label)
- No cron/scheduled jobs — reminder logic is frontend-computed
- No password recovery (auth page shows informative text instead of a dead link)
- Affiliate links are placeholder alerts
- Contact form (contact-us.html) has no backend — shows prototype notice, `send()` only updates UI state
- No contact import (CSV, Google Contacts, vCard)
- Gift "curation" is a static lookup table, not the scoring-based recommendation engine planned for production (see Blueprint Section 11.1)

## Structural Critique & Migration Notes

**What's solid:**
- The data schema is well-designed and maps cleanly to Postgres. Four core tables (profiles, contacts, events, reminder_log) with sensible fields, a denormalized `user_id` on events for query efficiency, and cascade-delete on contacts→events.
- The Store API design is clean — namespaced, consistent return shapes (`{ contact }` / `{ error }`), and the interface can be swapped to Supabase client calls without changing the calling code.
- Documentation is thorough. The blueprint, competitive assessment, and prioritized todo list are unusually well-thought-out for a prototype.
- The email-config.js file is production-ready documentation of DNS records, compliance headers, and warmup schedules.
- The admin panel with conversion funnel tracking shows the right metrics mindset.

**What was fixed in Tier P (prototype polish):**
- Mobile sidebar collapse on all 5 authenticated pages (P.1)
- Onboarding: progress bar corrected, validation hints added, month-aware day dropdowns, custom event label required (P.2)
- Auth form: email preserved across mode toggle, Google OAuth visually disabled, "Forgot password?" replaced with informative text, dead `googleNotAvailable()` removed (P.3, P.6)
- Contacts: submit button disabled when first name empty (P.3)
- Settings: send-hour dropdown extended to 6AM–9PM, full IANA timezone displayed, delete account shows cascade count (P.4, P.5)
- Contact-us: prototype notice added above submit button (P.6)
- store.js: `daysUntilLabel()` simplified from 3 redundant branches to a clean fallthrough (dead code trim)
- index.html: removed empty `landingApp()` function (dead code trim)

**What still needs work before production:**
- **No component reuse.** Every page re-implements sidebar nav, signOut(), initials getter, auth guards, and utility formatting — including the new mobile sidebar pattern. During the Next.js migration, extract these into shared components/hooks.
- **Gift data is in a shared JS file (`js/gift-data.js`) but still static.** In production, move to a structured `gift_catalog` table with tags, affinities, and price tiers. A deterministic weighted scoring function selects items per reminder — no LLM, zero per-query cost (see Go-Live Plan Phase 1.4 — the single most important feature gap).
- **Cookie consent logic is standalone.** The `COOKIE_KEY` and cookie functions in index.html should be centralized in store.js or a dedicated module.
- **No input sanitization.** The prototype trusts all input. Production must sanitize server-side before DB insertion.
- **No error boundaries.** If Store calls fail silently, pages may render in broken states. Production needs proper error handling and user-facing error states.
- **contact-us.html form is non-functional.** Has a prototype notice now, but still needs a backend (Formspree, Resend, or a Next.js API route) for production.
- **CSS is repeated across every file.** Common styles (`.sidebar-link`, `.badge-urgent/soon/upcoming`, `.gradient-text`) are copy-pasted. Extract to a shared stylesheet or Tailwind plugin during migration.
- **No tests.** README has a manual QA checklist but no automated tests. Production should have at minimum: unit tests for Store logic (especially reminder date math and timezone handling), and integration tests for the auth + onboarding flow.
- ~~**Sensitive-event handling missing.**~~ ✅ Fixed. Events now have `suppress_gifts` boolean, subtle checkbox in forms, and email preview respects the flag with a warm gift-free message.

## Key Files to Understand First

If you're picking this up cold, read in this order:
1. `js/store.js` — the entire data model and business logic
2. `dashboard.html` — the core user experience
3. `email-preview.html` — what the actual product delivers (the reminder email)
4. `Landmarks_Go_Live_Plan.docx` — phased plan for production migration and what's missing
5. `Landmarks_Technical_Architecture.docx` — full architecture documentation
6. `Landmarks_Competitive_Assessment.docx` — competitive landscape and strategic positioning

## Conventions

- All dates stored as month (1-12) + day (1-31), not full Date objects
- UUIDs via `crypto.randomUUID()` with fallback polyfill
- Alpine.js components defined as top-level functions per page (e.g., `dashboardApp()`)
- Tailwind brand color palette: orange-warm (`brand-50` through `brand-900`, primary `brand-600` = `#d05a32`)
- Urgency thresholds: 0-3 days = urgent (red), 4-7 = soon (orange), 8+ = upcoming (green)
- Demo data seeded via `Store.seed.run()` on landing page load (only if no users exist)
- Mobile sidebar: `sidebarOpen` Alpine boolean + fixed sidebar with `-translate-x-full` transform + overlay div, toggled by hamburger button visible below `md` breakpoint
- Form validation pattern: `disabled:opacity-40 disabled:cursor-not-allowed` on submit buttons bound to `:disabled` conditions
