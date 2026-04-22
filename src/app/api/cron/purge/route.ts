import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { compareTokens } from "@/lib/utils";

/**
 * GET /api/cron/purge
 *
 * Daily via Vercel Cron. Hard-deletes contacts whose `deleted_at` timestamp
 * is older than 7 days. Cascade deletes remove associated events, reminder_log,
 * and shown_gifts rows (enforced by FK ON DELETE CASCADE in schema).
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
    const { data: deleted, error } = await supabase
      .from("contacts")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffISO)
      .select("id");

    if (error) throw error;

    const count = deleted?.length || 0;

    return NextResponse.json({
      ok: true,
      purged: count,
      cutoff: cutoffISO,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error("Purge cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
