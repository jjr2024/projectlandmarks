/**
 * Pure decision logic for the auth callback route (`/auth/callback`).
 *
 * Extracted so the branching can be unit-tested without mocking `@supabase/ssr`
 * or the network. The route handler feeds real runtime values in; this function
 * decides where to redirect.
 *
 * Background: under PKCE the `code_verifier` lives in the browser that called
 * signUp(). When a verification link is opened on a *different* device, the
 * server-side GoTrue `/verify` step still confirms the email and mints a `code`,
 * but `exchangeCodeForSession()` fails on the new device (no verifier). We must
 * NOT report that as "expired" — the email is verified, we just can't bind a
 * session here. See docs/auth-callback-option-b-plan.md.
 */

export type CallbackError =
  | { message?: string | null; code?: string | null; status?: number | null }
  | null;

export interface CallbackInput {
  /** `?code=` — only minted by a successful server-side verify (signup/OAuth/magic-link). */
  code: string | null;
  /** True when exchangeCodeForSession returned an error. */
  exchangeFailed: boolean;
  /** True when getUser() returned a user after a failed exchange (same-device w/ session). */
  hasUser: boolean;
  /** `?error=` GoTrue passes on its server-side failure redirect (e.g. "access_denied"). */
  errorParam: string | null;
  /** `?error_code=` GoTrue passes on failure (e.g. "otp_expired"). */
  errorCode: string | null;
}

/**
 * Advisory only — used for logging/telemetry, NOT for the redirect decision.
 * gotrue-js error strings drift across versions, so the redirect is gated on the
 * structural signal (a code was minted) rather than on matching these patterns.
 */
export function looksLikeVerifierMismatch(error: CallbackError): boolean {
  if (!error) return false;
  const m = (error.message ?? "").toLowerCase();
  const c = (error.code ?? "").toLowerCase();
  return (
    m.includes("code verifier") ||
    m.includes("code_verifier") ||
    m.includes("both auth code and code verifier") ||
    m.includes("invalid request") ||
    c === "validation_failed" ||
    c === "bad_code_verifier" ||
    c === "flow_state_not_found" ||
    error.status === 400 ||
    error.status === 403
  );
}

/**
 * Returns the absolute-path redirect target (no origin) for a callback request.
 * `next` is the already-validated post-login destination.
 */
export function resolveCallbackRedirect(input: CallbackInput, next: string): string {
  const { code, exchangeFailed, hasUser, errorParam, errorCode } = input;

  if (code) {
    // (A) same-device success.
    if (!exchangeFailed) return next;
    // (B) same-device with an existing session (e.g. re-clicked link while signed in).
    if (hasUser) return next;
    // (C) a code existed => server-side verify already succeeded, but no session on
    //     this device => almost certainly cross-device PKCE. Email IS verified;
    //     route to sign-in with a truthful notice instead of a false "expired".
    return "/auth?verified=1";
  }

  // No code below this point.

  // (D) GoTrue redirected here with an error (consumed/expired token = second tap).
  if (errorParam || errorCode) return "/auth?error=link_expired";

  // (E) Genuine unknown (no code, no error param).
  return "/auth?error=auth_callback_failed";
}
