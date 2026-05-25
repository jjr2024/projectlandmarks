import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/delete-account
 *
 * Fully deletes a user's account:
 * 1. Verifies the requesting user's session (must be deleting their own account)
 * 2. Calls the delete_user_account RPC to cascade-delete all app data
 * 3. Deletes the auth.users record via the Admin API so the credentials are gone
 *
 * The RPC alone only clears application tables (profiles, contacts, events, etc.)
 * but leaves auth.users intact — meaning the user could log back in to an empty
 * account. This route closes that gap. See bug sweep: account deletion bug.
 */
export async function POST(request: NextRequest) {
  // Authenticate via session cookie — only the logged-in user can delete themselves
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Step 1: Run the RPC to cascade-delete all application data
  const { error: rpcError } = await adminClient.rpc("delete_user_account", {
    target_user_id: user.id,
  });

  if (rpcError) {
    console.error("delete_user_account RPC failed:", rpcError);
    return NextResponse.json(
      { error: "Failed to delete account data. Please contact support." },
      { status: 500 }
    );
  }

  // Step 2: Delete the auth.users record so the credentials are fully gone
  const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
    user.id
  );

  if (deleteAuthError) {
    // App data is already gone at this point. Log the error but still return
    // a message asking the user to contact support for cleanup.
    console.error("auth.admin.deleteUser failed:", deleteAuthError);
    return NextResponse.json(
      {
        error:
          "Account data was deleted but we could not fully remove your login credentials. Please contact support@daysight.xyz for assistance.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
