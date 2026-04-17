# Landmarks — Local Prototype

Birthday & gift reminder service. Local prototype for UI/UX testing.

## Quick Start

No installation required. Open `index.html` in your browser.

```
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

Or serve it with any static file server (recommended for a realistic experience):

```bash
python3 -m http.server 3000
# then visit http://localhost:3000
```

## Demo Account

A demo account is pre-seeded with 5 contacts and upcoming events:

- **Email:** demo@landmarks.app
- **Password:** demo1234

Or create your own account — data lives in your browser's localStorage.

## Pages & User Flow

| Page | File | Notes |
|------|------|-------|
| Landing | `index.html` | Marketing/pre-auth homepage |
| Sign Up / Sign In | `auth.html` | Combined auth page |
| Onboarding | `onboarding.html` | Post-signup guided setup (4 steps) |
| Dashboard | `dashboard.html` | Upcoming reminders overview |
| Contacts | `contacts.html` | List, add, edit, delete contacts |
| Contact Detail | `contact.html?id=<id>` | Manage events + gift prefs per contact |
| Settings | `settings.html` | Profile, reminder timing, data export |
| Email Preview | `email-preview.html` | See exactly what reminder emails look like |

## What's Working

- Full auth flow: sign up → onboarding → dashboard → sign out → sign in
- Contacts: create, edit, delete, search, filter by relationship
- Events per contact: birthday, anniversary, custom — with month/day, optional year
- Gift category preferences (per-contact or default global)
- Upcoming reminders: sorted by days until event, urgency color coding
- Dashboard stats: contacts, events, urgency count, this-month count
- Settings: display name, timezone, reminder timing (multi-day chip picker), default gift, data export as JSON, account deletion
- Email preview: swap contact, event type, days-before, gift category — see live email render
- Onboarding: 4-step guided flow for new users — who / what date / gift vibe / done

## Data

All data is stored in `localStorage`. Clearing browser storage resets everything.

For production migration, swap the `Store` functions in `js/store.js` with Supabase client calls. The interface is designed to map 1:1 with the Supabase schema in the blueprint.

## Production Stack (when ready to launch)

Per the blueprint:
- **Frontend + API:** Next.js on Vercel
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Email:** Resend
- **Cron:** Vercel Cron

The localStorage store maps exactly to the 4-table schema (profiles, contacts, events, reminder_log).

## Things to Test

1. **Onboarding flow** — sign up fresh, go through all 4 steps, check the confirmation screen
2. **Reminder urgency** — check dashboard with events 1–3 days out (urgent/red), 4–7 days (orange), 8+ days (green)
3. **Email preview** — swap contacts and gift categories, check subject line length warning
4. **Empty states** — delete all contacts, verify dashboard and contacts page handle it cleanly
5. **Data export** — Settings → Export my data → verify JSON is complete
6. **Account deletion** — Settings → Delete account → type DELETE → confirm wipe

## Known Limitations (Prototype)

- No real email sending (email preview shows what will be sent)
- No Google OAuth (placeholder button)
- No cron/scheduled jobs (reminder logic is frontend-computed)
- No password recovery
- Affiliate links are placeholders
