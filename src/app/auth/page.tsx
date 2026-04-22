"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const router = useRouter();
  const supabase = createClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setFailedAttempts((prev) => prev + 1);
      // Detect rate limiting (Supabase free tier: 3-4 auth emails/hour)
      if (error.status === 429 || error.message?.toLowerCase().includes("rate limit")) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else {
        // Never reveal whether the email exists or what's wrong with the password
        setError("Invalid email or password.");
      }
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      // Detect rate limiting (Supabase free tier: 3-4 auth emails/hour)
      if (error.status === 429 || error.message?.toLowerCase().includes("rate limit")) {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (
        error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("user already exists")
      ) {
        // Duplicate email — use generic message to avoid email enumeration
        setError("Unable to create account. Please try signing in instead.");
      } else {
        // Generic fallback for other errors
        setError("Unable to create account. Please try again or contact support.");
      }
      setLoading(false);
      return;
    }

    // Supabase returns a user with an empty identities array when the email
    // is already registered. Detect this and show a generic error that doesn't
    // confirm account existence (security best practice).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError("Unable to create account. Please try signing in instead.");
      setLoading(false);
      return;
    }

    setSignupSuccess(true);
    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === "signin" ? "signup" : "signin");
    setError("");
    setSignupSuccess(false);
    // Preserve email across mode toggle (matches prototype behavior)
  };

  if (signupSuccess) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-green-50 border border-green-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-green-800 mb-2">Check your email</h2>
            <p className="text-green-700">
              We sent a confirmation link to <strong>{email}</strong>. Click it to
              activate your account, then come back here to sign in.
            </p>
          </div>
          <button
            onClick={() => {
              setSignupSuccess(false);
              setMode("signin");
            }}
            className="mt-4 text-brand-600 hover:underline text-sm"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2">
          {mode === "signin" ? "Welcome back to " : "Get started with "}
          <span className="text-brand-600">Daysight</span>
        </h1>
        <p className="text-gray-500 text-center mb-8">
          {mode === "signin"
            ? "Sign in to see your upcoming reminders."
            : "Create a free account — it takes 30 seconds."}
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {error}
            </div>
          )}

          {failedAttempts >= 2 && mode === "signin" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 mb-4 text-sm">
              Having trouble?{" "}
              <Link
                href={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="font-semibold underline"
              >
                Reset your password
              </Link>
            </div>
          )}

          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp}>
            {mode === "signup" && (
              <div className="mb-4">
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              {mode === "signup" && (
                <p className="mt-1 text-xs text-gray-400">At least 8 characters</p>
              )}
              {mode === "signin" && (
                <div className="mt-1 text-right">
                  <Link
                    href={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "signin"
                ? "Sign in"
                : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={toggleMode} className="text-brand-600 font-semibold hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={toggleMode} className="text-brand-600 font-semibold hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
