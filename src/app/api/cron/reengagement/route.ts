import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG } from "@/lib/email-config";
import ReengagementEmail, { reengagementSubject } from "@/emails/reengagement";
import { isRateLimitError, emptyCronResults } from "@/lib/reminders";
import { compareTokens } from "@/lib/utils";

/**
 * GET /api/cron/reengagement
 *
 * Daily via Vercel Cron. Sends D+3/D+10/D+30 drip emails to verified users
 * with zero contacts. Sends at most one drip per user per run. Stops on 429.
 *
 * Drip tracking: profiles.drips_sent JSONB (not reminder_log — no event/contact FK).
 */

const DRIP_SCHEDULE = [
  { day: 3, variant: "import_nudge" as const },
  { day: 10, variant: "sample_reminder" as const },
  { day: 30, variant: "concierge_add" as const },
];

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
  const results = emptyCronResults();

  try {
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const verifiedUsers = users.users.filter((u) => !!u.email_confirmed_at);

    for (const user of verifiedUsers) {
      if (results.rateLimited) break;

      try {
        const userEmail = user.email;
        if (!userEmail) continue;

        const createdAt = new Date(user.created_at);
        const daysSinceSignup = Math.floor(
          (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null);

        if (count && count > 0) {
          results.skipped++;
          continue;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, drips_sent, consent_terms, consent_emails")
          .eq("id", user.id)
          .single();

        // Skip users who haven't consented — required for Amazon affiliate compliance
        if (!profile?.consent_terms || !profile?.consent_emails) {
          results.skipped++;
          continue;
        }

        const firstName = profile?.display_name?.split(" ")[0] || "there";
        const dripsSent: Record<string, string> = profile?.drips_sent || {};

        for (const drip of DRIP_SCHEDULE) {
          if (daysSinceSignup < drip.day) continue;
          if (dripsSent[drip.variant]) continue;

          const subject = reengagementSubject(firstName, drip.variant);
          const { data: emailResult, error: emailError } = await resend().emails.send({
            from: EMAIL_CONFIG.from,
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
            if (isRateLimitError(emailError)) {
              results.rateLimited = true;
              results.deferred++;
              break;
            }
            results.errors.push(`User ${user.id}, drip ${drip.variant}: ${emailError.message}`);
            break;
          }

          // Atomic JSONB update to prevent race conditions with concurrent cron runs.
          // Uses Postgres || operator to merge the new key into existing drips_sent.
          try {
            const { error: rpcError } = await supabase.rpc("update_drips_sent", {
              p_user_id: user.id,
              p_variant: drip.variant,
              p_sent_at: now.toISOString(),
            });
            if (rpcError) {
              results.errors.push(`User ${user.id}, drip ${drip.variant}: RPC update_drips_sent failed — ${rpcError.message}`);
              continue;
            }
          } catch (rpcException: any) {
            results.errors.push(`User ${user.id}, drip ${drip.variant}: RPC update_drips_sent exception — ${rpcException.message}`);
            continue;
          }

          results.sent++;
          break; // One drip per user per run
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
