/**
 * Unit tests for the auth callback redirect decision (Option B).
 *
 * Covers the cross-device PKCE case where a verification link is opened on a
 * device that never held the code_verifier: the email is verified server-side
 * but exchangeCodeForSession() fails, and we must NOT report "expired".
 *
 * Run with: `npx tsx src/__tests__/auth-callback.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCallbackRedirect,
  looksLikeVerifierMismatch,
  validateNext,
  isAllowedOtpType,
  type CallbackInput,
} from "../lib/auth-callback";

const NEXT = "/dashboard";

function input(overrides: Partial<CallbackInput>): CallbackInput {
  return {
    code: null,
    exchangeFailed: false,
    hasUser: false,
    errorParam: null,
    errorCode: null,
    ...overrides,
  };
}

describe("resolveCallbackRedirect", () => {
  test("same-device success: code present, exchange OK -> next", () => {
    const r = resolveCallbackRedirect(
      input({ code: "abc", exchangeFailed: false }),
      NEXT
    );
    assert.equal(r, NEXT);
  });

  test("same-device with existing session: exchange fails but getUser -> next", () => {
    const r = resolveCallbackRedirect(
      input({ code: "abc", exchangeFailed: true, hasUser: true }),
      NEXT
    );
    assert.equal(r, NEXT);
  });

  test("cross-device PKCE: code present, exchange fails, no session -> verified", () => {
    const r = resolveCallbackRedirect(
      input({ code: "abc", exchangeFailed: true, hasUser: false }),
      NEXT
    );
    assert.equal(r, "/auth?verified=1");
  });

  test("garbage code with no session -> verified (benign; documented)", () => {
    const r = resolveCallbackRedirect(
      input({ code: "garbage", exchangeFailed: true, hasUser: false }),
      NEXT
    );
    assert.equal(r, "/auth?verified=1");
  });

  test("second tap on consumed token: no code, otp_expired -> link_expired", () => {
    const r = resolveCallbackRedirect(
      input({ code: null, errorParam: "access_denied", errorCode: "otp_expired" }),
      NEXT
    );
    assert.equal(r, "/auth?error=link_expired");
  });

  test("no code, only error param present -> link_expired", () => {
    const r = resolveCallbackRedirect(
      input({ code: null, errorParam: "access_denied", errorCode: null }),
      NEXT
    );
    assert.equal(r, "/auth?error=link_expired");
  });

  test("no code, no error params -> generic auth_callback_failed", () => {
    const r = resolveCallbackRedirect(input({ code: null }), NEXT);
    assert.equal(r, "/auth?error=auth_callback_failed");
  });

  test("custom next is honored on success paths", () => {
    const r = resolveCallbackRedirect(
      input({ code: "abc", exchangeFailed: false }),
      "/settings"
    );
    assert.equal(r, "/settings");
  });
});

describe("looksLikeVerifierMismatch (advisory telemetry only)", () => {
  test("matches code_verifier message", () => {
    assert.equal(
      looksLikeVerifierMismatch({ message: "invalid request: both auth code and code verifier should be non-empty" }),
      true
    );
  });

  test("matches known error codes", () => {
    assert.equal(looksLikeVerifierMismatch({ code: "validation_failed" }), true);
    assert.equal(looksLikeVerifierMismatch({ code: "flow_state_not_found" }), true);
  });

  test("matches 4xx status", () => {
    assert.equal(looksLikeVerifierMismatch({ status: 403 }), true);
    assert.equal(looksLikeVerifierMismatch({ status: 400 }), true);
  });

  test("null / unrelated error -> false (redirect decision is structural, not this)", () => {
    assert.equal(looksLikeVerifierMismatch(null), false);
    assert.equal(looksLikeVerifierMismatch({ message: "network timeout", status: 503 }), false);
  });
});

describe("validateNext (shared open-redirect guard)", () => {
  test("safe same-origin path is preserved", () => {
    assert.equal(validateNext("/dashboard"), "/dashboard");
    assert.equal(validateNext("/contacts?add=1"), "/contacts?add=1");
  });

  test("null / empty falls back to default", () => {
    assert.equal(validateNext(null), "/dashboard");
    assert.equal(validateNext(undefined), "/dashboard");
    assert.equal(validateNext(""), "/dashboard");
  });

  test("protocol-relative URL is rejected", () => {
    assert.equal(validateNext("//evil.com"), "/dashboard");
  });

  test("absolute URL with scheme is rejected", () => {
    assert.equal(validateNext("https://evil.com"), "/dashboard");
    assert.equal(validateNext("javascript:alert(1)"), "/dashboard");
  });

  test("non-slash relative path is rejected", () => {
    assert.equal(validateNext("dashboard"), "/dashboard");
  });

  test("custom fallback is honored", () => {
    assert.equal(validateNext(null, "/auth/reset-password"), "/auth/reset-password");
  });
});

describe("isAllowedOtpType (confirm flow type allowlist)", () => {
  test("accepts the types Daysight redeems", () => {
    assert.equal(isAllowedOtpType("signup"), true);
    assert.equal(isAllowedOtpType("email"), true);
    assert.equal(isAllowedOtpType("recovery"), true);
    assert.equal(isAllowedOtpType("email_change"), true);
  });

  test("rejects unused / crafted types", () => {
    assert.equal(isAllowedOtpType("magiclink"), false);
    assert.equal(isAllowedOtpType("invite"), false);
    assert.equal(isAllowedOtpType("sms"), false);
    assert.equal(isAllowedOtpType(null), false);
    assert.equal(isAllowedOtpType(""), false);
  });
});
