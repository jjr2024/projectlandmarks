"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [noSession, setNoSession] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Guard: prevent double code exchange when the effect re-runs
  // before router.replace has updated searchParams (race condition).
  const codeExchangedRef = useRef(false);

  // Helper: check for an existing session (with retry). Supabase may
  // establish a session asynchronously from URL hash-fragment tokens
  // (implicit flow fallback) even when the PKCE code exchange fails.
  // A short delay + retry gives the auth client time to process them.
  const checkSessionWithRetry = async (retries = 3, delayMs = 500): Promise<boolean> => {
    for (let i = 0; i < retries; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return true;
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    return false;
  };

  // Listen for PASSWORD_RECOVERY event — Supabase fires this when a
  // recovery session is detected, including from hash-fragment tokens.
  // This overrides any prior "noSession" state from a failed PKCE
  // exchange, since the session is now valid regardless.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setNoSession(false);
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Session detection: three paths, tried in order.
  //
  // 1. ?code= present → PKCE exchange (standard SSR flow).
  // 2. PKCE exchange fails → fallback: wait briefly and check for a
  //    session established via URL hash-fragment tokens. Supabase
  //    redirects with BOTH ?code= (PKCE) and #access_token= (implicit)
  //    as a fallback. The hash-based session is detected asynchronously
  //    by the Supabase browser client, so we retry a few times.
  // 3. No ?code= at all → check existing cookie-based session (covers
  //    the case where the user re-visits the page after a session was
  //    already established, e.g. clicking an expired OTP link).
  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      // Prevent double exchange — the effect can re-run if the
      // component re-renders before router.replace updates the URL.
      if (codeExchangedRef.current) return;
      codeExchangedRef.current = true;

      supabase.auth.exchangeCodeForSession(code).then(async ({ error }) => {
        if (!error) {
          setSessionReady(true);
          // Clean up URL so refreshing doesn't re-attempt the exchange
          router.replace("/auth/reset-password", { scroll: false });
          return;
        }

        console.error("[reset-password] Code exchange failed:", error.message);

        // Fallback: the PKCE exchange failed (most likely missing
        // code_verifier — common when the reset link opens in a
        // cross-site redirect chain from the email client). But
        // Supabase also includes implicit-flow tokens in the URL
        // hash, which the browser client processes asynchronously.
        // Wait briefly and check if a session appeared.
        const hasSession = await checkSessionWithRetry();
        if (hasSession) {
          setSessionReady(true);
          router.replace("/auth/reset-password", { scroll: false });
        } else {
          setNoSession(true);
        }
      });
    } else {
      // No code param — check for existing cookie-based session.
      // This handles: re-clicking an expired OTP link after a session
      // was already established, or arriving after the URL was cleaned.
      checkSessionWithRetry(2, 300).then((hasSession) => {
        if (hasSession) {
          setSessionReady(true);
        } else if (!codeExchangedRef.current) {
          setNoSession(true);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // Redirect to dashboard after a short delay
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (noSession) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-amber-800 mb-2">Reset link expired</h2>
            <p className="text-amber-700 mb-4">
              This password reset link has expired or was opened in a different browser.
              Please request a new one.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
              Request new reset link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!sessionReady) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-gray-400 text-sm">Loading...</div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Password updated</h2>
            <p className="text-green-700">
              Your password has been reset. Redirecting you to the dashboard...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">Set a new password</h1>
        <p className="text-gray-500 text-center mb-8">
          Choose a new password for your Daysight account.
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm new password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth" className="text-sm text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center px-4"><div className="text-gray-400 text-sm">Loading...</div></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
