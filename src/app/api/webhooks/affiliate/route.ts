import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const secret = process.env.AFFILIATE_WEBHOOK_SECRET;
  if (secret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

  const supabase = createAdminClient();

  // If reminder_id is provided, look up lead time for analytics
  let reminderLead: number | null = null;
  if (body.reminder_id) {
    const { data: log } = await supabase
      .from("reminder_log")
      .select("days_before")
      .eq("id", body.reminder_id)
      .maybeSingle();
    reminderLead = log?.days_before || null;
  }

  await supabase.from("conversion_events").insert({
    reminder_id: body.reminder_id || null,
    user_id: body.user_id || null,
    event_type: "purchased",
    partner: body.partner,
    gift_category: body.gift_category || null,
    reminder_lead: reminderLead,
    commission: body.commission,
  });

  return NextResponse.json({ ok: true });
}
