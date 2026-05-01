import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSignedUrl } from "@/lib/tokens";

/**
 * GET /api/calendar-url
 *
 * Returns the HMAC-signed calendar subscription URL for the authenticated user.
 * Called from the settings page to avoid exposing the signing logic client-side.
 */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = buildSignedUrl(user.id, "calendar");
  return NextResponse.json({ url });
}
