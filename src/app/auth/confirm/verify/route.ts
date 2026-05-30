import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isAllowedOtpType, validateNext } from "@/lib/auth-callback";

/**
 * Token_hash verification handler (Option A). Receives a POST from the
 * interstitial confirm page (/auth/confirm) and redeems the OTP server-side.
 *
 * Why POST (not GET): the interstitial page renders a button that posts here,
 * so email scanners / link prefetchers — which issue GETs and never submit
 * forms — cannot consume the single-use token_hash before the human clicks.
 *
 * Why verifyOtp (not exchangeCodeForSession): verifyOtp validates the
 * token_hash server-side with NO PKCE code_verifier, so it succeeds and mints a
 * session on ANY device — eliminating the cross-device dead-end that the PKCE
 * `?code=` flow has on /auth/callback.
 */
export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "");
  const next = validateNext(String(form.get("next") ?? ""));

  // 303 so the browser re-issues the redirect as a GET (default 307 would
  // replay the POST against the destination).
  const linkExpired = NextResponse.redirect(`${origin}/auth?error=link_expired`, { status: 303 });

  if (!tokenHash || !isAllowedOtpType(type)) {
    return linkExpired;
  }

  // Build the redirect response FIRST so verifyOtp's session cookies are wired
  // onto it. Mirrors the load-bearing pattern in auth/callback/route.ts — the
  // shared server client's cookie writes do NOT propagate to a separately
  // constructed NextResponse.redirect().
  const cookieStore = cookies();
  const redirectResponse = NextResponse.redirect(`${origin}${next}`, { status: 303 });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, options as any);
          });
        },
      },
    }
  );

  // Never log token_hash — it is a single-use credential.
  const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });

  if (!error) {
    return redirectResponse;
  }

  console.error("[auth/confirm] verifyOtp failed:", error.message, { type });
  return linkExpired;
}
