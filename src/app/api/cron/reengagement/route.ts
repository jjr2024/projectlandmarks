import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG } from "@/lib/email-config";
import ReengagementEmail, { reengagementSubject } from "@/emails/reengagement";

/**
 * GET /api/cron/reengagement
 *
 * Runs daily via Vercel Cron. Checks for verified users with 0 contacts
 * who signed up 3, 10, or 30 days ago and sends the appropriate drip email.
 * Stops once a user adds their first contact.
 */

const DRIP_SCHEDULE = [
  { day: 3, variant: "import_nudge" as const },
  { day: 10, variant: "sample_reminder" as const },
  { day: 30, variant: "concierge_add" as const },
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results = { sent: 0, skipped: 0, errors: [] as string[] };

  try {
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const verifiedUsers = users.users.filter((u) => !!u.email_confirmed_at);

    for (const user of verifiedUsers) {
      try {
        const userEmail = user.email;
        if (!userEmail) continue;

        // Calculate days since signup
        const createdAt = new Date(user.created_at);
        const daysSinceSignup = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check if user has any contacts (non-deleted)
        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null);

        // User has contacts — they're activated, skip entirely
        if (count && count > 0) {
          results.skipped++;
          continue;
        }

        // Get profile for first name
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, drips_sent")
          .eq("id", user.id)
          .single();

        const firstName = profile?.display_name?.split(" ")[0] || "there";

        // Find which drip to send (if any)
        // Track sent drips via the profile's drips_sent JSONB field
        const dripsSent: Record<string, string> = profile?.drips_sent || {};

        for (const drip of DRIP_SCHEDULE) {
          if (daysSinceSignup < drip.day) continue;
          if (dripsSent[drip.variant]) continue; // Already sent

          // Send the drip email
          const subject = reengagementSubject(firstName, drip.variant);
          const { data: emailResult, error: emailError } = await resend.emails.send({
            from: "Daysight <hello@daysight.xyz>",
            to: userEmail,
            replyTo: EMAIL_CONFIG.replyTo,
            subject,
            react: ReengagementEmail({
              firstName,
              variant: drip.variant,
              userId: user.id,
            }),
            headers: EMAIL_CONFIG.headers({
              userId: user.id,
              reminderType: "reengagement",
            }),
          });

          if (emailError) {
            results.errors.push(`User ${user.id}, drip ${drip.variant}: ${emailError.message}`);
            break; // Don't try later drips if this one failed
          }

          // Mark drip as sent in profile
          dripsSent[drip.variant] = now.toISOString();
          await supabase
            .from("profiles")
            .update({ drips_sent: dripsSent })
            .eq("id", user.id);

          results.sent++;
          break; // Only send one drip per user per run
        }
      } catch (userError: any) {
        results.errors.push(`User ${user.id}: ${userError.message}`);
      }
    }

    return NextResponse.json({ ok: true, ...results, timestamp: now.toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
