# Implementation Plan — Option A: Device-independent email confirmation via `token_hash` + `verifyOtp`

**Status:** Plan only. No code changed yet. Supersedes the *root cause* that Option B (`docs/auth-callback-option-b-plan.md`) could only relabel. Option B stays in place; Option A removes the cross-device dead-end entirely.

**Goal:** Make the email-confirmation link redeemable — and auto-login — on **any device**, eliminating the PKCE `code_verifier` device-binding that forces cross-device users to fall back to a password sign-in. Optionally, unify password reset onto the same flow to retire the fragile client-side `exchangeCodeForSession` + hash-fallback machinery in `reset-password/page.tsx`.

---

## 1. Why the current flow fails (confirmed by Supabase auth logs)

Signup uses Supabase PKCE. `signUp()` mints a `code_verifier` stored **only in the browser that signed up** (the laptop). The confirmation email currently links to `{{ .ConfirmationURL }}` → GoTrue `/verify` → redirect to `/auth/callback?code=…`. The `code` can only be exchanged by the browser holding the matching verifier.

Observed timeline for a real cross-device signup (`jamesohr+test7@gmail.com`, two distinct IPs = two devices):

| Time (UTC) | Event | Device | Meaning |
|---|---|---|---|
| 22:13:28 | `/signup` 200 | laptop (…249) | `code_verifier` stored on laptop only |
| 22:13:37 | `/verify` 303 `user_signedup` | phone (…248) | **email confirmed server-side**; redirect to `/auth/callback?code=…` |
| 22:13:46 | `/verify` 303 → 403 `"One-time token not found"` | phone (…248) | second hit; single-use token already spent → genuine "expired" |
| 22:13:57 | `/token` 200 `grant_type=password` | laptop (…249) | sign-in works — email was confirmed at :37 |

Two independent defects fall out of this:
1. **Cross-device can never auto-login.** PKCE structurally forbids it. Option B only changes the *message* ("verified — sign in") — the user still has to sign in manually on the phone.
2. **Single-use token consumed by link prefetch/double-tap.** The `:37`→`:46` double `/verify` is the signature of an email scanner or double-tap consuming the one-time token, yielding a real `403`.

`token_hash` + `verifyOtp` fixes (1) outright and lets us defeat (2) with an interstitial confirm step.

---

## 2. How the `token_hash` flow works

Instead of GoTrue minting a PKCE `code`, the email embeds an opaque **`token_hash`**. Our own server route calls `supabase.auth.verifyOtp({ type, token_hash })`, which verifies the OTP **server-side with no `code_verifier`** and mints a session. Because nothing device-local is required, the link works and logs in on any device.

- **Email template** (Supabase dashboard) switches from `{{ .ConfirmationURL }}` to a link we control, e.g.
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
- **New route** `/auth/confirm` reads `token_hash` + `type`, calls `verifyOtp`, sets session cookies on the redirect response, and redirects to `next`.
- `verifyOtp` `type` values we use: `signup` (email confirmation), `recovery` (password reset, phase 2), `email_change` (future email-change, if ever enabled).

This is the pattern Supabase recommends for SSR apps; it is the supported replacement for the PKCE confirmation link.

---

## 3. Anti-scanner hardening (recommended): interstitial confirm

`token_hash` links are still single-use, so a GET-only email scanner that prefetches the link would consume it before the human clicks (exactly defect #2 above). Defeat this by **not verifying on GET**:

- `/auth/confirm` is a **page** (Server Component) that reads the query params and renders a single **"Confirm my email"** button. A scanner that fetches the page does *not* click the button, so the token is untouched.
- The button triggers the actual verification via a **route handler** (`POST /auth/confirm` or `GET /auth/confirm/complete`) that calls `verifyOtp`, sets cookies, and redirects.

Trade-off: one extra click for the user, in exchange for immunity to the prefetch consumption that caused the reported "expired". **Recommended for signup.** A simpler **direct-GET verify** variant (verify immediately in a route handler, no button) is documented in §8 as the lower-effort fallback if the extra click is unacceptable — it keeps the cross-device fix but remains scanner-vulnerable.

---

## 4. Files touched

**Code (this repo):**
- **NEW** `src/app/auth/confirm/page.tsx` — interstitial page: validates `type`/`next`, renders the confirm button. (Direct-GET variant: skip this file.)
- **NEW** `src/app/auth/confirm/route.ts` — route handler that runs `verifyOtp({ type, token_hash })`, wires session cookies onto the redirect response (reuse the load-bearing cookie pattern from `auth/callback/route.ts:30-48`), and redirects to validated `next`.
- `src/app/auth/page.tsx` — update `emailRedirectTo` targets (`:104`, `:134`, `:200`) and **simplify** `handleResendVerification` (`:73-153`): under `token_hash`, `resend()` links are device-independent, so the "prefer `signUp()` to regenerate the PKCE pair" workaround is no longer needed. Keep the already-verified (`identities.length === 0`) detection.
- `src/components/email-verification-banner.tsx` — update `emailRedirectTo` (`:65`); same resend simplification applies.
- `src/lib/auth-callback.ts` — extract the `next` open-redirect validation (currently inline in `callback/route.ts:13-20`) into a shared helper so `/auth/confirm` reuses it. No change to `resolveCallbackRedirect`.

**Phase 2 (optional, password-reset unification):**
- `src/app/auth/forgot-password/page.tsx` — `resetPasswordForEmail` template/`redirectTo` switches to the `token_hash` recovery link.
- `src/app/auth/reset-password/page.tsx` — drop `exchangeCodeForSession` + `checkSessionWithRetry` + hash-fallback (`:23-112`); the session is already established by `/auth/confirm` before arrival, so the page just confirms `getSession()` and renders the form.

**Supabase dashboard (manual — NOT in repo, load-bearing):**
- **Auth → Email Templates → Confirm signup**: link → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`.
- **(Phase 2) Reset password template**: link → `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password`.
- **Auth → URL Configuration → Redirect allowlist**: ensure `https://daysight.xyz/auth/confirm` (and `/auth/reset-password`) are allowlisted; confirm `Site URL` is `https://daysight.xyz`.

**No DB/migration change. No new env vars.**

---

## 5. `/auth/confirm` route — target behavior (pseudocode)

```
// route handler (POST from the interstitial button, or GET in the direct variant)
const token_hash = params.get("token_hash");
const type       = params.get("type");          // validate ∈ {signup, recovery, email_change}
let   next       = validateNext(params.get("next") ?? "/dashboard");  // shared open-redirect guard

if (!token_hash || !ALLOWED_TYPES.has(type)) {
  return redirect("/auth?error=link_expired");   // reuse Option B's truthful message
}

const cookieStore = cookies();
const redirectResponse = NextResponse.redirect(`${origin}${next}`);
const supabase = createServerClient(URL, ANON, { cookies: wireOnto(redirectResponse) });  // same as callback

const { error } = await supabase.auth.verifyOtp({ type, token_hash });
if (!error) return redirectResponse;             // session set → auto-login on ANY device

console.error("[auth/confirm] verifyOtp failed", { type, otpLike: looksLikeExpired(error) });
return NextResponse.redirect(`${origin}/auth?error=link_expired`);  // genuinely consumed/expired
```

Notes / invariants:
- **Never log `token_hash`.** It is a single-use credential.
- `type` allowlist rejects arbitrary input (`magiclink` not used; Google OAuth disabled).
- `next` runs through the **same** validation as `callback/route.ts` (no `//`, no scheme) — extract once into `auth-callback.ts`, import in both.
- The cookie-on-`redirectResponse` wiring is load-bearing — mirror `callback/route.ts:30-48` exactly; do not use the shared `server.ts` client (its `cookies()` writes don't propagate to a separately constructed `NextResponse.redirect`, the bug the callback comment documents).

---

## 6. Sequencing / rollout (order matters)

1. **Deploy the `/auth/confirm` route first** (code), while emails still use the old `{{ .ConfirmationURL }}` template. The new route is dormant — nothing links to it yet. Zero risk to live signups.
2. **Flip the Supabase email template** to the `token_hash` link. New confirmation emails now use the device-independent flow.
3. **In-flight old links** (already-sent `?code=` emails) keep working via the untouched `/auth/callback` (same-device) and Option B's truthful messaging (cross-device). No coordinated cutover needed; the two flows coexist.
4. Ship the `auth/page.tsx` resend simplification **after** step 2 is verified, so the fallback isn't removed before the new path is proven.
5. **Phase 2** (password reset) is independent — ship after signup confirmation is stable.

`/auth/callback` is **retained** for OAuth (when re-enabled) and in-flight links. Do not delete it.

---

## 7. Security review

- **token_hash** is single-use, short-TTL, server-verified; never logged.
- **Open-redirect**: `next` validated by the shared guard (reused from callback). Interstitial + route handler both validate.
- **type allowlist** prevents redeeming a token for an unintended OTP type.
- **Scanner immunity** (interstitial variant): GET prefetch renders a button page, consumes nothing; only a human click verifies. This is the concrete fix for the proven prefetch/double-tap consumption.
- **Recovery (phase 2)**: `verifyOtp({type:'recovery'})` mints a recovery session server-side — same trust model as today's reset link, but without the cross-site `code_verifier` fragility. Middleware already permits `/auth/reset-password` while signed in (`middleware.ts:52-53`); add `/auth/confirm` to the public/non-protected set (it is already non-protected — it is neither in `protectedPaths` nor exactly `/auth`, so no middleware change is strictly required; verify during implementation).
- **Email enumeration**: unchanged — forgot-password still returns the generic response.

---

## 8. Edge cases

1. **Same-device signup confirm:** click → `/auth/confirm` → `verifyOtp` ok → `/dashboard`, logged in. (Was: also worked, via PKCE.)
2. **Cross-device signup confirm (the fix):** click on phone → `verifyOtp` ok → `/dashboard` on the phone, logged in. **No password step.**
3. **Consumed/expired token (second tap, real expiry):** `verifyOtp` errors → `/auth?error=link_expired` (Option B's accurate message + resend button).
4. **Scanner prefetch (interstitial variant):** GET renders button; token intact; human click succeeds. **Defect #2 eliminated.**
5. **Scanner prefetch (direct-GET variant):** token consumed by scanner → human sees `link_expired` → resend. (Same failure mode as today; cross-device auto-login still fixed. This is the trade-off of skipping the interstitial.)
6. **Garbage `token_hash`:** `verifyOtp` errors → `link_expired`. No session minted (stronger than Option B's "garbage code → benign verified=1", because `verifyOtp` actually validates server-side).
7. **OAuth / magic-link:** untouched — still flow through `/auth/callback`. OAuth currently disabled; no blast radius.
8. **Resend after template flip:** `resend({type:'signup'})` now produces a `token_hash` link that works cross-device — the PKCE caveat in CLAUDE.md no longer applies to resent links.

---

## 9. Test plan

**Pure logic (automated, no network mock):** extract `validateNext()` and a `resolveConfirmRedirect({ verified, type, errored }, next)` into `auth-callback.ts`; add `src/__tests__/auth-confirm.test.ts` asserting: valid type+success → `next`; bad/missing type → `link_expired`; verify error → `link_expired`; `next` open-redirect attempts (`//evil`, `https://evil`) → `/dashboard`. Mirrors the existing `src/__tests__/auth-callback.test.ts`.

**Manual matrix:**

| # | Setup | Expected |
|---|---|---|
| A1 | Sign up, confirm in **same** browser | `/dashboard`, logged in |
| A2 | Sign up in Browser A, confirm in Browser B / phone | **`/dashboard` on B, logged in** (the fix) |
| A3 | Click an already-used confirm link | `/auth?error=link_expired` + resend |
| A4 | Interstitial: fetch confirm URL without clicking, then click later | Click still succeeds (scanner-safe) |
| A5 | `/auth/confirm` with garbage/again-used `token_hash` | `link_expired`, no session |
| A6 | Resend verification, open on a different device | Works + logs in (cross-device) |
| P1 | (Phase 2) Forgot password → open recovery link on phone | Lands on reset-password with a live session; can set password |

**Logs to confirm:** Supabase Auth shows `POST /verify` (or `/otp`) for the `verifyOtp` call succeeding, with **no** subsequent `/token grant_type=pkce`. Vercel logs show `[auth/confirm] verifyOtp failed` only on genuine expiry. Pre-push: `npx tsc --noEmit` (full `npm run build` times out in constrained envs per CLAUDE.md).

---

## 10. Scope decisions to confirm before building

- **D1 — Anti-scanner interstitial vs direct-GET verify** (§3/§8). Recommended: **interstitial** for signup, since the logs proved prefetch/double-tap is the real "expired" trigger. Full trade-off analysis below.

### D1 in depth

Both variants fix the cross-device dead-end (defect #1 — PKCE binding). They differ **only** on defect #2: an email scanner or client that pre-fetches the link (a plain GET) before the human clicks.

**Direct-GET verify** — `/auth/confirm` is a route handler that calls `verifyOtp` immediately on the GET request.
- *Pros:* simplest to build (one file, no UI); zero extra clicks; identical to the textbook Supabase SSR snippet.
- *Cons:* the `token_hash` is single-use, so the **first GET wins**. A scanner/prefetch GET consumes it server-side and silently mints a session in the *scanner's* cookie jar (thrown away). When the human then clicks, the token is already spent → `403` → `link_expired`. This is the *exact* failure the logs captured (`:37` success then `:46` 403). So this variant keeps the false-"expired" risk for any user whose mail provider or security appliance prefetches links.
- *Who it bites:* corporate/AV mail gateways (Proofpoint, Mimecast, Defender Safe Links), and some mobile mail previews. Plain Gmail generally does **not** auto-follow arbitrary links, so many consumer users are unaffected — but you can't rely on that.

**Interstitial confirm** — `/auth/confirm` is a page that renders a "Confirm my email" button; the button triggers the route handler that calls `verifyOtp`.
- *Pros:* a GET prefetch only renders HTML — it never calls `verifyOtp`, so the token survives until a **human clicks**. This is the only variant that actually closes defect #2, the thing that produced the reported bug. Robust against every GET-only scanner.
- *Cons:* one extra click and a brief page; marginally more code (a page + a handler); a scanner that executes JS *and* auto-submits forms (rare) could still trip it — mitigated by using a button that requires a real click rather than auto-firing on load.

**Recommendation:** interstitial for **signup** (the proven pain point). If/when phase 2 lands, password **recovery** can reasonably use direct-GET — a prefetched recovery link that gets consumed just sends the user to "request a new link," and recovery links are requested on demand so a stale one is low-cost. Net: pay the one-click tax where it eliminated a real bug; skip it where the failure is cheap.
- **D2 — Phase 2 (unify password reset)** now or later. Recommended: **ship signup first**, then phase 2 as a follow-up — it deletes the most fragile code (`reset-password/page.tsx` retry/hash machinery) but is independently testable.
- **D3 — Post-confirm landing — RESOLVED: `next=/dashboard`.** `/dashboard` already self-routes correctly: `dashboard/page.tsx:65-79` pushes brand-new users (account < 1h old **and** zero contacts) to `/onboarding`, while returning users stay put. The reverse guard does **not** exist — `(onboarding)/layout.tsx` only gates on auth + consent and has no "already-onboarded → dashboard" redirect — so defaulting to `/onboarding` would strand returning users in the wizard. Therefore `/dashboard` is the only target with the right redirect in both directions. (Verified May 2026.)

## 11. Rollback

Pure mechanical revert: flip the Supabase email template back to `{{ .ConfirmationURL }}`. New emails immediately return to the PKCE `/auth/callback` flow (still present). The `/auth/confirm` route can be left deployed and dormant. No DB or env state to undo.
