import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard";

  // Validate redirect URL to prevent open redirect attacks
  if (!next.startsWith("/") || next.startsWith("//")) {
    next = "/dashboard";
  }
  // Additional check: reject if next contains a protocol (http://, https://, etc.)
  if (/^[a-z][a-z0-9+\-.]*:/i.test(next)) {
    next = "/dashboard";
  }

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
    });

    // PKCE fallback: resend() does not regenerate the PKCE
    // code_verifier, so re-sent verification links may fail the
    // exchange. However, Supabase verifies the email server-side
    // before redirecting here. If the user already has an active
    // session (e.g. they signed in unverified, then clicked a
    // re-sent verification link), redirect them to the app
    // instead of showing an error — their email is now verified.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or exchange failed, redirect to auth with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
