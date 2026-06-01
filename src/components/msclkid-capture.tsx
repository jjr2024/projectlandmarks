"use client";

import { useEffect } from "react";

/**
 * Microsoft Ads click-ID capture (Path B, tag-less conversion tracking).
 *
 * When a user arrives from a Bing/Microsoft ad, auto-tagging appends
 * `?msclkid=<32-char id>` to the landing URL. We capture it first-party into a
 * cookie so it survives the email-verification round-trip and is available at
 * signup, where it is attached to the user's auth metadata. A server-side
 * reconciliation cron later reports verified-signup / activation conversions to
 * Microsoft via the Conversions API using this id. No third-party tag or cookie
 * is loaded in the browser — see MARKETING.md §12 and Privacy Policy §6.
 *
 * Deliberately best-effort and defensive: any failure is swallowed so this can
 * never break page rendering. Ads land on the public homepage, which is not
 * redirected by middleware, so the param is present on first paint.
 */

const COOKIE_NAME = "ds_msclkid";
// 90 days — comfortably covers Microsoft's click-to-conversion attribution window.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
// msclkid is a 32-char hex string; allow alphanumeric up to 64 as a safe guard
// against storing arbitrary/oversized query junk.
const MSCLKID_PATTERN = /^[a-zA-Z0-9]{1,64}$/;

export default function MsclkidCapture() {
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("msclkid");
      if (!id || !MSCLKID_PATTERN.test(id)) return;

      // Last-click wins: overwrite any prior id with the most recent click.
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        `${COOKIE_NAME}=${encodeURIComponent(id)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // No-op: capture must never interfere with the page.
    }
  }, []);

  return null;
}
