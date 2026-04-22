"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      // Detect rate limiting (Supabase free tier: 3-4 auth emails/hour)
      if (error.status === 429 || error.message?.toLowerCase().includes("rate limit")) {
        setError("Too many requests. Please wait a few minutes and try again.");
      } else {
        setError(error.message);
      }
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-green-800 mb-2">Check your email</h2>
          <p className="text-green-700">
            If an account exists for <strong>{email}</strong>, we sent a password
            reset link. It expires in 1 hour.
          </p>
        </div>
        <Link href="/auth" className="mt-4 inline-block text-brand-600 hover:underline text-sm">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-bold text-center mb-2">Reset your password</h1>
      <p className="text-gray-500 text-center mb-8">
        Enter your email and we&apos;ll send you a link to set a new password.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
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

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/auth" className="text-sm text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
