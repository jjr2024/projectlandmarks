import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/admin/export?userId=<uuid>
 *
 * Admin-only endpoint to export a user's data as JSON.
 * Auth: session cookie — caller must have is_admin=true in profiles.
 *
 * Returns: JSON with profile, contacts, events, reminder_log.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Verify caller is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get target user ID from query params
  const targetUserId = request.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  // Basic UUID format check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
    return NextResponse.json({ error: "Invalid userId format" }, { status: 400 });
  }

  // Use admin client to bypass RLS and fetch all user data
  const admin = createAdminClient();

  const [profileRes, contactsRes, eventsRes, logsRes] = await Promise.all([
    admin.from("profiles").select("*").eq("id", targetUserId).single(),
    admin.from("contacts").select("*").eq("user_id", targetUserId),
    admin.from("events").select("*").eq("user_id", targetUserId),
    admin.from("reminder_log").select("*").eq("user_id", targetUserId).order("sent_at", { ascending: false }).limit(200),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    exported_by: user.email,
    target_user_id: targetUserId,
    profile: profileRes.data || null,
    contacts: contactsRes.data || [],
    events: eventsRes.data || [],
    reminder_log: logsRes.data || [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="daysight-export-${targetUserId.slice(0, 8)}-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
