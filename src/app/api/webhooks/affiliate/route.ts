import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { compareTokens } from "@/lib/utils";

/**
 * POST /api/webhooks/affiliate
 *
 * Receives purchase postbacks from affiliate partners.
 * Inserts a 'purchased' conversion_event with commission data.
 *
 * Auth: shared secret via AFFILIATE_WEBHOOK_SECRET env var.
 *
 * Expected payload:
 * {
 *   reminder_id?: string,   // UUID from reminder_log (passed via affiliate URL params)
 *   user_id?: string,       // UUID — the Daysight user who clicked
 *   partner: string,        // affiliate partner name
 *   gift_category?: string, // e.g. "flowers"
 *   commission: number,     // e.g. 4.50
 *   order_ref?: string      // affiliate's order reference (for reconciliation)
 * }
 */
export async function POST(request: NextRequest) {
  // Verify webhook authenticity — secret is required in production
  const secret = process.env.AFFILIATE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("AFFILIATE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  // Timing-safe comparison
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!compareTokens(bearerToken, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.partner || body.commission == null) {
    return NextResponse.json({ error: "Missing partner or commission" }, { status: 400 });
  }

  // Validate commission is a non-negative number within a reasonable range
  const commission = Number(body.commission);
  if (isNaN(commission) || commission < 0 || commission > 10000) {
    return NextResponse.json({ error: "Invalid commission value" }, { status: 400 });
  }

  // Validate partner is a reasonable string (alphanumeric, dashes, underscores)
  if (typeof body.partner !== "string" || body.partner.length > 100) {
    return NextResponse.json({ error: "Invalid partner value" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Require at least one of reminder_id or user_id for attribution
  if (!body.reminder_id && !body.user_id) {
    return NextResponse.json({ error: "Must provide reminder_id or user_id" }, { status: 400 });
  }

  // If reminder_id is provided, look up the reminder and cross-check user_id
  let reminderLead: number | null = null;
  let verifiedUserId: string | null = body.user_id || null;

  if (body.reminder_id) {
    const { data: log } = await supabase
      .from("reminder_log")
      .select("days_before, user_id")
      .eq("id", body.reminder_id)
      .maybeSingle();

    if (!log) {
      return NextResponse.json({ error: "reminder_id not found" }, { status: 400 });
    }

    reminderLead = log.days_before || null;

    // If both reminder_id and user_id provided, they must match
    if (body.user_id && log.user_id !== body.user_id) {
      console.error(`Affiliate webhook user_id mismatch: body=${body.user_id}, reminder=${log.user_id}`);
      return NextResponse.json({ error: "user_id does not match reminder owner" }, { status: 400 });
    }

    // Use the verified user_id from the reminder_log
    verifiedUserId = log.user_id;
  }

  const { error: insertError } = await supabase.from("conversion_events").insert({
    reminder_id: body.reminder_id || null,
    user_id: verifiedUserId,
    event_type: "purchased",
    partner: body.partner,
    gift_category: body.gift_category || null,
    reminder_lead: reminderLead,
    commission,
  });

  if (insertError) {
    console.error("Failed to insert conversion event:", insertError);
    return NextResponse.json({ error: "Failed to record conversion" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
