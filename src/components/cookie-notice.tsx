"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const STORAGE_KEY = "daysight_cookie_notice_dismissed";

/**
 * Subtle, closable cookie transparency banner.
 *
 * Daysight only sets strictly-necessary cookies (Supabase auth session).
 * No analytics, no marketing, no third-party tracking cookies.
 * This banner exists for transparency, not for consent collection —
 * essential cookies are exempt under GDPR (ePrivacy Directive) and CCPA/CPRA.
 */
export default function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner only if user hasn't dismissed it yet
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. private browsing) — show banner, no persistence
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Silently fail if storage is unavailable
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
      <div className="max-w-xl mx-auto px-4 pb-4">
        <div className="pointer-events-auto bg-gray-900/95 backdrop-blur-sm text-gray-300 text-sm rounded-xl px-5 py-3.5 flex items-center gap-4 shadow-lg border border-gray-800">
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="flex-1 leading-snug">
            This site only uses essential cookies to keep you signed in.{" "}
            <Link
              href="/privacy"
              className="underline text-gray-100 hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
