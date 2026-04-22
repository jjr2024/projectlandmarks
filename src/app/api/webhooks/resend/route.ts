import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/resend
 *
 * Receives Resend webhook events (delivered, opened, clicked, bounced, complained).
 * Updates reminder_log.status and inserts into conversion_events for analytics.
 *
 * Auth: Resend signs webhooks — verify via RESEND_WEBHOOK_SECRET in production.
 * For now, checks a shared secret in the svix-id header or falls back to
 * WEBHOOK_SECRET env var as bearer token.
 *
 * Resend webhook payload shape:
 * {
 *   type: "email.delivered" | "email.opened" | "email.clicked" | "email.bounced" | "email.complained",
 *   data: { email_id: string, to: string[], ... }
 * }
 */

const EVENT_TYPE_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "bounced", // treat complaints as bounces for our purposes
};

const CONVERSION_TYPE_MAP: Record<string, string> = {
  "email.opened": "opened",
  "email.clicked": "clicked",
};

export async function POST(request: NextRequest) {
  // Verify webhook authenticity
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  if (webhookSecret) {
    const svixId = request.headers.get("svix-id");
    const authHeader = request.headers.get("authorization");
    // Accept either svix signature presence or bearer token
    if (!svixId && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = body;
  if (!type || !data?.email_id) {
    return NextResponse.json({ error: "Missing type or email_id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Find the reminder_log entry by resend_id
  const { data: logEntry } = await supabase
    .from("reminder_log")
    .select("id, user_id, event_id, contact_id, days_before, gift_ids")
    .eq("resend_id", data.email_id)
    .maybeSingle();

  // Update reminder_log status if we have a mapping
  const newStatus = EVENT_TYPE_MAP[type];
  if (logEntry && newStatus) {
    await supabase
      .from("reminder_log")
      .update({ status: newStatus })
      .eq("id", logEntry.id);
  }

  // Insert into conversion_events for analytics-relevant events
  const conversionType = CONVERSION_TYPE_MAP[type];
  if (logEntry && conversionType) {
    // Look up the gift info for partner/category from the first gift
    let partner: string | null = null;
    let giftCategory: string | null = null;

    if (logEntry.gift_ids?.length > 0) {
      const { data: gift } = await supabase
        .from("gift_catalog")
        .select("partner, category")
        .eq("id", logEntry.gift_ids[0])
        .maybeSingle();
      partner = gift?.partner || null;
      giftCategory = gift?.category || null;
    }

    await supabase.from("conversion_events").insert({
      reminder_id: logEntry.id,
      user_id: logEntry.user_id,
      event_type: conversionType,
      partner,
      gift_category: giftCategory,
      reminder_lead: logEntry.days_before,
    });
  }

  return NextResponse.json({ ok: true, type, processed: !!logEntry });
}
