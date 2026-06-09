"use client";

import { useEffect } from "react";

/**
 * Organic-referral capture (link-in-bio / Instagram attribution).
 *
 * When a visitor arrives from a marketing surface we control — e.g. the
 * Instagram bio link `https://daysight.xyz/?igref=bio` — we capture the
 * `igref` slug first-party into a cookie so it survives the email-verification
 * round-trip and is available at signup, where it is attached to the user's
 * auth metadata. The handle_new_user() trigger then persists it to
 * profiles.signup_source for admin-dashboard reporting.
 *
 * This is the organic-traffic sibling of MsclkidCapture (paid Bing ads). Unlike
 * msclkid there is no external Conversions API to report to — igref is purely
 * first-party internal analytics. No third-party tag or cookie is loaded.
 *
 * Deliberately best-effort and defensive: any failure is swallowed so this can
 * never break page rendering. The bio link lands on the public homepage, which
 * is not redirected by middleware, so the param is present on first paint.
 */

const COOKIE_NAME = "ds_igref";
// 90 days — generous window to cover the click → signup → verify journey.
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90;
// Short human-readable slug: alphanumerics, hyphen, underscore, up to 64 chars.
// Bounds what we store against arbitrary/oversized query junk.
const IGREF_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export default function IgrefCapture() {
  useEffect(() => {
    try {
      const id = new URLSearchParams(window.location.search).get("igref");
      if (!id || !IGREF_PATTERN.test(id)) return;

      // Last-touch wins: overwrite any prior ref with the most recent landing.
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        `${COOKIE_NAME}=${encodeURIComponent(id)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
    } catch {
      // No-op: capture must never interfere with the page.
    }
  }, []);

  return null;
}
