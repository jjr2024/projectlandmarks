import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/tokens";

/**
 * POST /api/unsubscribe
 *
 * Verifies an HMAC-signed unsubscribe token and sets consent_emails=false
 * on the user's profile. No login required — the signed token is the auth.
 *
 * Body: { uid: string, token: string }
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { uid, token } = body;

  if (!uid || !token || typeof uid !== "string" || typeof token !== "string") {
    return NextResponse.json({ error: "Missing uid or token" }, { status: 400 });
  }

  // Validate UUID format
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uid)) {
    return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
  }

  // Verify HMAC token
  if (!verifyToken(uid, token, "unsubscribe")) {
    return NextResponse.json({ error: "Invalid or expired unsubscribe link" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Set consent_emails to false — this gates all cron email sending
  const { error } = await supabase
    .from("profiles")
    .update({ consent_emails: false })
    .eq("id", uid);

  if (error) {
    console.error("Failed to unsubscribe user:", error);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
