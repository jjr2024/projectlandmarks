import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { compareTokens } from "@/lib/utils";

// Cross-user read over all accounts — give it headroom like the cron routes.
export const maxDuration = 60;
// Always recompute; never serve a cached conversion file to Microsoft.
export const dynamic = "force-dynamic";

/**
 * GET /api/ads/microsoft-conversions?token=...
 *
 * Microsoft Ads offline-conversion feed (Path B, tag-less — see MARKETING.md §12).
 *
 * Microsoft's *scheduled import* fetches this URL on a schedule and ingests the
 * CSV. We compute conversions on the fly from existing data — there is no
 * conversions table and nothing is written here (this route is read-only):
 *
 *   - "Daysight Signup"    → verified signup. msclkid present in auth metadata
 *                            AND email_confirmed_at set. Conversion time =
 *                            email_confirmed_at (stable → idempotent re-imports).
 *   - "Daysight Activation"→ onboarding completed. Conversion time = the user's
 *                            earliest contact created_at (stable; equals the
 *                            moment activation happened — first contact saved).
 *
 * Idempotency: Microsoft dedupes offline conversions by (MicrosoftClickId,
 * ConversionName, ConversionTime). Because both timestamps above are stable,
 * re-serving the same row every pull is safe — set each OfflineConversionGoal's
 * CountType to "Unique" so only the first per click is counted.
 *
 * 90-day window: Microsoft rejects conversions older than 90 days, so we only
 * emit rows whose conversion time is within the window.
 *
 * Privacy: msclkid-only. No PII (no email, no hashed email) is sent to Microsoft.
 *
 * Auth: a shared secret in the `token` query param (Microsoft's scheduled import
 * is URL-based, so we can't use a bearer header). Compared timing-safe. The
 * secret lives in MS_CONVERSIONS_TOKEN and is validated here, not in the global
 * env.ts required list, so a missing value can't break unrelated server routes.
 */

const SIGNUP_GOAL = "Daysight Signup";
const ACTIVATION_GOAL = "Daysight Activation";
const WINDOW_DAYS = 90;
const MSCLKID_PATTERN = /^[a-zA-Z0-9]{1,64}$/;

type Row = { msclkid: string; name: string; time: string };

export async function GET(request: NextRequest) {
  const expected = process.env.MS_CONVERSIONS_TOKEN;
  if (!expected) {
    // Misconfigured rather than unauthorized — surface clearly, leak nothing.
    return new NextResponse("Conversions feed not configured.", { status: 500 });
  }
  const token = request.nextUrl.searchParams.get("token");
  if (!compareTokens(token, expected)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;

  try {
    // 1. Users carrying an msclkid in auth metadata (paginate, 1000/page).
    const clicks = new Map<string, { msclkid: string; confirmedAt: string | null }>();
    let page = 1;
    const perPage = 1000;
    for (;;) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        return new NextResponse("Error reading users.", { status: 500 });
      }
      for (const u of data.users) {
        const raw = (u.user_metadata as Record<string, unknown> | null)?.msclkid;
        if (typeof raw === "string" && MSCLKID_PATTERN.test(raw)) {
          clicks.set(u.id, { msclkid: raw, confirmedAt: u.email_confirmed_at ?? null });
        }
      }
      if (data.users.length < perPage) break;
      page++;
    }

    if (clicks.size === 0) return csvResponse([]);

    const userIds = [...clicks.keys()];

    // 2. Activation: which of those users completed onboarding.
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, onboarding_completed")
      .in("id", userIds);
    if (profErr) return new NextResponse("Error reading profiles.", { status: 500 });
    const activated = new Set(
      (profiles ?? []).filter((p) => p.onboarding_completed).map((p) => p.id as string)
    );

    // 3. Stable activation timestamp = earliest contact per user.
    const firstContactAt = new Map<string, string>();
    if (activated.size > 0) {
      const { data: contacts, error: cErr } = await supabase
        .from("contacts")
        .select("user_id, created_at")
        .in("user_id", [...activated]);
      if (cErr) return new NextResponse("Error reading contacts.", { status: 500 });
      for (const c of contacts ?? []) {
        const uid = c.user_id as string;
        const prev = firstContactAt.get(uid);
        if (!prev || new Date(c.created_at as string) < new Date(prev)) {
          firstContactAt.set(uid, c.created_at as string);
        }
      }
    }

    // 4. Emit rows within the 90-day window.
    const rows: Row[] = [];
    for (const [userId, { msclkid, confirmedAt }] of clicks) {
      if (confirmedAt && new Date(confirmedAt).getTime() >= cutoff) {
        rows.push({ msclkid, name: SIGNUP_GOAL, time: toUtcSeconds(confirmedAt) });
      }
      if (activated.has(userId)) {
        const t = firstContactAt.get(userId);
        if (t && new Date(t).getTime() >= cutoff) {
          rows.push({ msclkid, name: ACTIVATION_GOAL, time: toUtcSeconds(t) });
        }
      }
    }

    return csvResponse(rows);
  } catch {
    return new NextResponse("Error building conversions feed.", { status: 500 });
  }
}

/** ISO 8601 UTC, whole seconds (e.g. 2026-06-01T13:30:00Z). Configure the import timezone as UTC. */
function toUtcSeconds(iso: string): string {
  return new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z");
}

function escapeCsv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function csvResponse(rows: Row[]): NextResponse {
  const header = "Microsoft Click ID,Conversion Name,Conversion Time";
  const lines = rows.map(
    (r) => `${r.msclkid},${escapeCsv(r.name)},${r.time}`
  );
  const body = [header, ...lines].join("\n") + "\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
