import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { compareTokens } from "@/lib/utils";

/**
 * GET /api/cron/purge
 *
 * Daily via Vercel Cron. Hard-deletes contacts and events whose `deleted_at`
 * timestamp is older than 7 days. Cascade deletes remove associated child rows
 * (events, reminder_log, shown_gifts, email_overrides) via FK ON DELETE CASCADE.
 *
 * This enforces the 7-day soft-delete expiry policy documented in CLAUDE.md.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Timing-safe comparison
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!compareTokens(bearerToken, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  try {
    // Calculate the cutoff: 7 days ago (explicit UTC)
    const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cutoffISO = cutoffDate.toISOString();

    // Hard-delete contacts where deleted_at is older than 7 days
    // (cascades to events, reminder_log, shown_gifts via FK)
    const { data: deletedContacts, error: contactsError } = await supabase
      .from("contacts")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffISO)
      .select("id");

    if (contactsError) throw contactsError;

    // Hard-delete events where deleted_at is older than 7 days
    // (cascades to reminder_log, email_overrides via FK)
    const { data: deletedEvents, error: eventsError } = await supabase
      .from("events")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffISO)
      .select("id");

    if (eventsError) throw eventsError;

    return NextResponse.json({
      ok: true,
      purgedContacts: deletedContacts?.length || 0,
      purgedEvents: deletedEvents?.length || 0,
      cutoff: cutoffISO,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Purge cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
