import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If no code or exchange failed, redirect to auth with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
