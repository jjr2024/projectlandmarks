import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/stats
 *
 * Returns aggregate stats that require the service-role client (bypasses RLS).
 * Auth: session cookie — caller must have is_admin=true in profiles.
 */
export async function GET() {
  // Verify session + admin status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use admin client for cross-user counts
  const admin = createAdminClient();

  const { count: totalUsers } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const { data: allUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const verifiedCount = allUsers?.users?.filter((u) => !!u.email_confirmed_at).length || 0;

  // Signup-source attribution (all-time, like totalUsers — independent of the
  // dashboard date range). Captured at signup from the ?igref= landing param;
  // NULL means direct/unknown. Single text column, reduced in memory.
  const { data: sourceRows } = await admin
    .from("profiles")
    .select("signup_source");

  const sourceCounts: Record<string, number> = {};
  for (const row of sourceRows || []) {
    const key = row.signup_source || "direct";
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  }
  const signupSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    verifiedUsers: verifiedCount,
    signupSources,
  });
}
