# Implementation Plan — Option B: Stop the auth callback misreporting a successful verification as "expired"

**Status:** Plan only. No code changed yet. Scope is **Option B only** (surgical callback fix, keeps PKCE). Options A (`token_hash`/`verifyOtp`) and E (resend/login UX) are deferred.

## Problem recap (confirmed by Supabase auth logs)

Cross-device signup. PKCE `code_verifier` is bound to the browser that called `signUp()`. When the verification link is opened on a different device:

| Time | Event | Meaning |
|---|---|---|
| 22:13:28 | signup | laptop mints `code_verifier`, stored in laptop browser only |
| 22:13:37 | `GET /verify 303 user_signedup` | phone tap → email confirmed **server-side**, redirect to `/auth/callback?code=…` |
| — | `exchangeCodeForSession` fails on phone | no `code_verifier` on phone → callback redirects to `/auth?error=auth_callback_failed` → **"expired" (false)** |
| 22:13:46 | `GET /verify 403 "One-time token not found"` | second tap; single-use token already consumed → genuinely expired |
| 22:13:57 | password login 200 | works — email was truly confirmed at :37 |

Two different "expired" surfaces collapse into one generic message today:
1. **False expiry** — first cross-device tap; verification *succeeded*, only the client-side session exchange failed.
2. **Real expiry** — second tap on a consumed/expired token.

Option B makes the callback tell these apart and stop lying.

## Files touched

- `src/app/auth/callback/route.ts` — branch on incoming GoTrue error params and on the exchange outcome.
- `src/app/auth/page.tsx` — new `verified` success banner + distinct `link_expired` message + a resend affordance reachable from the form.
- *(Optional, recommended for testability)* `src/lib/auth-callback.ts` — extract the pure redirect-decision into a testable helper.

**No Supabase config/template change. No DB/migration change.** (Those belong to Option A.)

---

## 1. `src/app/auth/callback/route.ts`

### Current control flow (as of this plan)

- `:6-7` parse `searchParams`, `code`.
- `:8-17` validate `next` (open-redirect guard) — **unchanged**.
- `:19` `if (code) {`
- `:25-43` build `redirectResponse` + server client with cookie wiring — **unchanged** (the cookie-on-`redirectResponse` pattern is load-bearing; keep it).
- `:45` `exchangeCodeForSession(code)`.
- `:47-49` `if (!error) return redirectResponse` — same-device success.
- `:52-55` `console.error("[auth/callback] Code exchange failed:", …)`.
- `:64-67` `getUser()` fallback → if user, redirect to app.
- `:71` final catch-all → `/auth?error=auth_callback_failed`.

### Target control flow (pseudocode)

```
const code        = searchParams.get("code");
const errParam    = searchParams.get("error");        // GoTrue server-side error (query string)
const errCode     = searchParams.get("error_code");   // e.g. "otp_expired"
// ... existing `next` validation unchanged ...

if (code) {
  // ... existing cookie-wired client + redirectResponse build (25-43) ...
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) return redirectResponse;                       // (A) same-device success — UNCHANGED

  console.error("[auth/callback] Code exchange failed:", error.message, {
    code: code.slice(0, 8) + "...", next,
    pkceLike: looksLikeVerifierMismatch(error),              // advisory telemetry only (see §4)
  });

  // (B) same-device with an existing session — UNCHANGED (keep BEFORE the new branch)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return NextResponse.redirect(`${origin}${next}`);

  // (C) NEW: a code existed => GoTrue /verify already succeeded server-side
  //     (signup confirm / OAuth / magic link all only mint a code AFTER verifying).
  //     Exchange failed AND no session on this device => almost certainly cross-device PKCE.
  //     The email IS verified; we just can't bind a session here. Route to sign-in with a
  //     truthful success notice instead of a false "expired".
  console.error("[auth/callback] code present but no session after exchange; treating as verified", {
    pkceLike: looksLikeVerifierMismatch(error),
  });
  return NextResponse.redirect(`${origin}/auth?verified=1`);
}

// No code below this point.

// (D) NEW: GoTrue redirected here with an error (consumed/expired token = second tap).
if (errParam || errCode) {
  return NextResponse.redirect(`${origin}/auth?error=link_expired`);
}

// (E) Genuine unknown (no code, no error param) — UNCHANGED catch-all.
return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
```

### Key decision: the redirect is gated on a **structural** signal, not on error-string parsing

Branch (C) fires whenever **`code` was present AND exchange failed AND `getUser()` returned no user**. It does **not** depend on matching the gotrue-js error message. Rationale: a `code` is only ever minted by a *successful* server-side verify step, so its presence is strong proof that verification happened and only the device-local session bind failed. This is robust to gotrue-js string drift (see §4). `looksLikeVerifierMismatch()` is computed for logging only, so we can later tighten if telemetry shows surprises.

### Notes / invariants

- **Order matters:** `getUser()` (B) must stay *before* the new (C) branch so same-device-with-session still lands in the app.
- **`error`/`error_code` are query params**, readable server-side — GoTrue's `/verify` failure path issues a 303 to `redirect_to` with `?error=access_denied&error_code=otp_expired&error_description=…`. (If a flow ever delivers the error only in the URL *fragment*, the server can't see it and it degrades to branch (E)'s generic message — acceptable; out of scope for B.)
- The `next` open-redirect validation (`:8-17`) is untouched and still applies to branches (A)/(B). Branches (C)/(D)/(E) redirect to fixed `/auth?...` targets, so they need no `next` validation.

---

## 2. `src/app/auth/page.tsx`

### a) Extend the callback-error message map (`:8-11`)

```
const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed:
    "Your sign-in link has expired or is invalid. Please try again.",
  link_expired:
    "This verification link has expired or was already used. If you’ve already confirmed your email, just sign in below — otherwise resend a new link.",
};
```

This makes `?error=link_expired` flow automatically into the existing red error block (`:304-308`) via the existing `error` state seed (`:21-23`).

### b) Read the new `verified` param and render a green success banner

After `callbackError` (`:14-15`), add:

```
const verifiedNotice = searchParams.get("verified") === "1";
```

Render a **green** banner (distinct from the red error block) above the form — reuse the green styling already used by the signup-success screen (`:239`). Copy:

> **Email verified.** Please sign in below to finish setting up your account.

Mode already defaults to `"signin"` (`:17`), so the sign-in form is shown. The email field is blank on cross-device — expected; the user types email + password and signs in.

### c) Resend affordance for `link_expired` (kept minimal — full UX is Option E)

When `callbackError === "link_expired"`, render — below the red error block — an inline **Resend verification email** button that reuses the existing `handleResendVerification` (`:70-144`) and the existing `verificationResent` / `verificationError` / `resendCountdown` state and JSX pattern (mirror `:248-265`).

Add one guard at the top of `handleResendVerification` (`:70-72`) so it works from the bare form (where no email may be typed yet):

```
const handleResendVerification = async () => {
  setResendingVerification(true);
  setVerificationError("");
  if (!email) {                                   // NEW
    setVerificationError("Enter your email above, then resend.");
    setResendingVerification(false);
    return;
  }
  // ... existing two-tier signUp()/resend() logic unchanged ...
```

On the `link_expired` path the user typically has no password in state (cross-device or fresh tab), so the existing fallback branch (`resend()`, `:117-139`) runs. That is acceptable for B; the PKCE caveat is already handled by the callback’s own fallback. Tightening this is Option E.

### d) Do **not** route `verified=1` into the red `error` block

Keep `verified` entirely separate from the `error` state so the green banner renders, not a red one. The red block at `:304-308` continues to render only `error` (which now includes `link_expired`).

---

## 3. Query-param / redirect contract (callback ↔ auth page)

| Callback condition | Redirect target | Auth page renders |
|---|---|---|
| `code` present, exchange OK | `${origin}${next}` (e.g. `/dashboard`) | app (logged in) |
| `code` present, exchange fails, `getUser()` → user | `${origin}${next}` | app (logged in) |
| `code` present, exchange fails, **no** session | `/auth?verified=1` | **green** "Email verified — sign in" |
| **no** `code`, `error`/`error_code` present | `/auth?error=link_expired` | **red** link-expired + resend button |
| **no** `code`, **no** error param | `/auth?error=auth_callback_failed` | **red** generic (unchanged) |

Param vocabulary the auth page must understand: `error ∈ {auth_callback_failed, link_expired}` and `verified ∈ {"1"}`.

---

## 4. Robust detection of the verifier/PKCE error (and safe fallback)

gotrue-js error strings drift across versions, so **do not** make the redirect decision depend on them. Use the structural rule from §1(C). Provide `looksLikeVerifierMismatch(error)` purely for **logging/telemetry**:

```
function looksLikeVerifierMismatch(error): boolean {
  const m = (error?.message ?? "").toLowerCase();
  const c = (error?.code ?? "").toLowerCase();
  return (
    m.includes("code verifier") ||
    m.includes("code_verifier") ||
    m.includes("both auth code and code verifier") ||
    m.includes("invalid request") ||
    c === "validation_failed" ||
    c === "bad_code_verifier" ||
    c === "flow_state_not_found" ||
    error?.status === 400 || error?.status === 403
  );
}
```

**Safe fallback (the heuristic can't classify):** because the decision is structural (`code present + exchange failed + no session ⇒ verified=1`), an *unrecognized* error string changes nothing about the redirect — it only logs `pkceLike: false`. Worst realistic mis-fire is a transient Supabase/network error on the same device that owns the verifier: we’d send the user to `/auth?verified=1` → "please sign in." Since the email is in fact verified (a code was minted), signing in works, so the message is still truthful. The fallback never produces a *false success* that blocks the user.

---

## 5. Edge cases

1. **Same-device success (regression guard):** `code` present, exchange OK → app. Untouched (`route.ts:47-49`).
2. **Same-device, session already exists, exchange fails:** `getUser()` → user → app. Untouched (`route.ts:64-67`); stays ahead of the new branch.
3. **Cross-device first tap (the reported bug):** `code` present, exchange fails, no session → `/auth?verified=1` green banner → user signs in. **Fixed.** `auth.users.email_confirmed_at` is already set server-side.
4. **Second tap on a consumed token:** no `code`, `error_code=otp_expired` → `/auth?error=link_expired`. Accurate message + resend.
5. **Malformed/garbage `code`** (`/auth/callback?code=garbage` hand-crafted): `/verify` never ran, but `code` is present → exchange fails → `getUser()` null → `/auth?verified=1`. **Benign:** user is told to sign in; sign-in requires real credentials, so there is **no security impact** — only a slightly inaccurate message in an abuse/curiosity scenario. Documented tradeoff; not worth tightening in B because "invalid code" and "missing verifier" error strings overlap.
6. **OAuth / magic-link through the same callback:**
   - *Same-device success:* `code` present, exchange OK (verifier present) → app. Untouched.
   - *Cross-device (rare):* `code` present, exchange fails, no session → `/auth?verified=1`. Slightly off (they expected auto-login) but not broken — they can sign in. Note: Google OAuth is currently disabled ("coming soon" per CLAUDE.md) and magic-link isn’t used, so the live blast radius is email confirmation only. **Crucially, the OAuth/magic-link *success* path is untouched** — new behavior only triggers on exchange *failure*, which previously hit `auth_callback_failed` anyway.
7. **Both `code` and `error` present:** can’t happen from GoTrue (verify either mints a code or errors), but if it did, the `if (code)` branch wins — fine.

---

## 6. Test plan

### Manual matrix (primary)

| # | Setup | Expected |
|---|---|---|
| T1 | Sign up and click the link **in the same browser** | Lands on `/dashboard`, logged in (regression) |
| T2 | Sign up in Browser A, open link in Browser B / incognito | **Green** "Email verified — sign in"; signing in works; `email_confirmed_at` set (the fix) |
| T3 | Click an already-used link (or re-tap the T2 link) | **Red** link-expired + visible Resend button |
| T4 | Visit `/auth/callback?code=garbage` | Green verified banner (benign — documented) |
| T5 | Visit `/auth/callback` with no params | Red generic `auth_callback_failed` (unchanged) |
| T6 | `link_expired` page, click Resend with empty email field | Inline "Enter your email above, then resend." |
| T7 | `link_expired` page, fill email, click Resend | Cooldown + "Verification email sent" (existing resend behavior) |

### Automated (recommended)

Extract the decision into a pure helper to avoid mocking `@supabase/ssr`:

```
// src/lib/auth-callback.ts
type CallbackInput = { code: string | null; exchangeFailed: boolean; hasUser: boolean;
                       errorParam: string | null; errorCode: string | null };
export function resolveCallbackRedirect(i: CallbackInput, next: string): string { /* §1 logic */ }
```

Then a jest test (`src/__tests__/auth-callback.test.ts`, alongside the existing `reminders.test.ts`) asserts the redirect string for each row of the §3 contract table. This needs no network mocking and locks the branch logic. The route handler just feeds real values into the helper. *(This tiny refactor is optional but turns the riskiest logic into a unit-tested pure function.)*

### What to watch in logs to confirm

- **Vercel runtime logs:** existing `[auth/callback] Code exchange failed:` line, now followed by `code present but no session after exchange; treating as verified` with `pkceLike: true/false`. T2 should produce this pair; T1 should produce **no** error log.
- **Supabase Auth logs:** T2 shows `GET /verify 303 user_signedup` with **no** subsequent successful `/token?grant_type=pkce` (exchange failed) → matches a `verified=1` emission. T3 shows `GET /verify 403` (consumed) → matches `link_expired`.

---

## 7. Rollout / repo notes

- **Files:** `src/app/auth/callback/route.ts`, `src/app/auth/page.tsx` (+ optional `src/lib/auth-callback.ts` and its test).
- **No Supabase config or email-template change** (that is Option A). **No DB/migration change.**
- **Pre-push:** `npx tsc --noEmit` for fast type-check; full `npm run build` in a local terminal (per CLAUDE.md, full builds time out in constrained envs).
- **Blast radius:** new behavior only triggers on the callback *failure* paths, which previously all funneled to `auth_callback_failed`. Success paths (same-device confirm, OAuth/magic-link success) are byte-for-byte unchanged.
- **Worst-case degradation:** if the structural heuristic is ever wrong, the user sees "please sign in" and lands on the working sign-in form — the same destination as today, with better copy. Reverting is mechanical: delete branches (C) and (D) and the page’s `verified`/`link_expired` handling to restore exact current behavior. No flag needed.
- **Follow-ups (out of scope here):** Option E (smarter resend that prefers `signUp()` when password is present, clearer "already verified → go sign in" CTA) and Option A (`token_hash`/`verifyOtp` for true cross-device auto-login, plus unifying password-reset off PKCE).
