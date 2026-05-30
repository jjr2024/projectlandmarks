import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { looksLikeVerifierMismatch, resolveCallbackRedirect, validateNext } from "@/lib/auth-callback";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  // Validate redirect URL to prevent open redirect attacks (shared guard,
  // also used by /auth/confirm/verify).
  const next = validateNext(searchParams.get("next"));

  let hasUser = false;

  if (code) {
    // Create the redirect response FIRST so we can wire session cookies to it.
    // The previous implementation used the shared createClient() from server.ts
    // which sets cookies via cookies() from next/headers — those don't propagate
    // to a separately constructed NextResponse.redirect(). This caused password
    // reset (and any other code-exchange flow) to silently lose the session.
    const cookieStore = cookies();
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectResponse;
    }

    // Log the error so we can diagnose callback failures in Vercel logs
    console.error("[auth/callback] Code exchange failed:", error.message, {
      code: code.slice(0, 8) + "...",
      next,
      pkceLike: looksLikeVerifierMismatch(error),
    });

    // PKCE fallback: resend() does not regenerate the PKCE
    // code_verifier, so re-sent verification links may fail the
    // exchange. However, Supabase verifies the email server-side
    // before redirecting here. If the user already has an active
    // session (e.g. they signed in unverified, then clicked a
    // re-sent verification link), redirect them to the app
    // instead of showing an error — their email is now verified.
    const { data: { user } } = await supabase.auth.getUser();
    hasUser = !!user;

    // A code only exists because the server-side /verify step already
    // succeeded (signup confirm / OAuth / magic link). If the exchange
    // failed and there's no session on this device, the email IS verified
    // but the PKCE code_verifier lives on another device (cross-device
    // signup). resolveCallbackRedirect() routes that case to sign-in with a
    // truthful "verified" notice instead of a false "expired".
    // See docs/auth-callback-option-b-plan.md.
    if (!hasUser) {
      console.error(
        "[auth/callback] code present but no session after exchange; treating as verified",
        { pkceLike: looksLikeVerifierMismatch(error) }
      );
    }
  }

  const redirectPath = resolveCallbackRedirect(
    {
      code,
      exchangeFailed: true,
      hasUser,
      errorParam,
      errorCode,
    },
    next
  );
  return NextResponse.redirect(`${origin}${redirectPath}`);
}
