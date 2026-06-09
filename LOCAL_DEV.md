# Local Development — Full Signup Flow

Run Daysight entirely on your machine against a local Supabase stack. This is
the **quick** path: email confirmations are **off** (per `supabase/config.toml`),
so signup creates an instant logged-in session — no email step. That's ideal for
testing the `igref` → `profiles.signup_source` attribution end to end.

Prerequisite: **Docker Desktop installed and running.** Everything else uses the
`supabase` CLI already in `devDependencies` (call it with `npx supabase`).

Local ports (from `config.toml`): API `54321` · Postgres `54322` · Studio
`54323` · Mail catcher (Inbucket) `54324`.

---

## 1. Start the local Supabase stack

```bash
cd <repo root>
docker info >/dev/null && echo "Docker OK"   # sanity check

npx supabase start
```

First run pulls images (a few minutes). On a fresh DB it applies every file in
`supabase/migrations/` — including `20260609000026_add_signup_source.sql`, so the
local `profiles` table gets the new column and updated trigger automatically.

Then grab your local credentials:

```bash
npx supabase status
```

Note the **API URL** (`http://127.0.0.1:54321`), **anon key**, and
**service_role key**.

## 2. Point the app at local

```bash
cp .env.local .env.backup.local        # back up your prod values
```

Edit `.env.local` and change only these four lines (see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key (sb_publishable_...) from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<Secret key (sb_secret_...) from supabase status>
APP_URL=http://127.0.0.1:3000
```

Leave `RESEND_API_KEY`, `CRON_SECRET`, and the webhook secrets as they are —
they aren't used by the signup flow but must be non-empty.

> Switch back to prod anytime with `cp .env.backup.local .env.local`.

## 3. Run the app

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
```

## 4. Test the signup + attribution flow

1. Visit the landing page **with the bio param**:
   `http://127.0.0.1:3000/?igref=bio`
   (`IgrefCapture` writes the `ds_igref` cookie — confirm in DevTools →
   Application → Cookies.)
2. Click **Get started** / go to `/auth?mode=signup` and sign up with any email
   (e.g. `test@example.com`) and a password ≥ 8 chars. With confirmations off
   you're logged straight in and land in onboarding.
3. Verify attribution landed:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "select display_name, signup_source, created_at
      from profiles order by created_at desc limit 5;"
```

   You should see `signup_source = bio` for the new user. A signup without the
   param (plain `http://127.0.0.1:3000`) yields `signup_source = NULL`
   ("direct"). You can also browse this in Studio: `http://127.0.0.1:54323`.

   Edge-case checks: try `?igref=has space` or `?igref=<junk>` — the strict
   slug validation drops them, so `signup_source` stays NULL.

## 5. (Optional) See it in the admin dashboard

Promote your test user and open the admin panel:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "update profiles set is_admin = true where display_name = 'test';"
```

Visit `http://127.0.0.1:3000/admin` → the **By Signup Source** table shows the
per-source counts and share.

## 6. Teardown

```bash
npx supabase stop          # stops containers, keeps data
# or
npx supabase stop --no-backup   # stop and wipe local data
cp .env.backup.local .env.local   # restore prod env when done
```

---

## Handy resets

- Re-apply all migrations + seed from scratch (wipes local data):
  `npx supabase db reset`
- Tail auth/db logs: `npx supabase logs` (or watch the Studio logs panel).

## Notes & gotchas

- **This is local only.** Nothing here touches the production Supabase project.
  The `signup_source` migration was already applied to prod separately.
- **Confirmations are off locally** but **on in production**. If you later want
  to exercise the real email-verification (`/auth/confirm` token_hash) flow
  locally, set `enable_confirmations = true` under `[auth.email]` in
  `config.toml`, restart, and read the verification email at the Inbucket inbox
  (`http://127.0.0.1:54324`). Mirroring the *custom* prod confirm template also
  requires an `[auth.email.template.confirmation]` override — ask if you want
  that wired up.
- Don't commit `.env.local` or `.env.backup.local` (both are gitignored via
  `.env*.local`). `.env.local.example` is safe to commit.
