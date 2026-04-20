"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function EmailVerificationBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const supabase = createClient();

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
    }
    setSending(false);
    setSent(true);
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4 mb-6 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <svg
          className="w-5 h-5 text-amber-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Verify your email</span> to start receiving reminders.
          {sent ? (
            <span className="ml-1 text-amber-600">Verification email sent!</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={sending}
              className="underline hover:text-amber-900 font-medium ml-1"
            >
              {sending ? "Sending..." : "Send verification email"}
            </button>
          )}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
