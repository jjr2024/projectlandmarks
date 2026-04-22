import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG } from "@/lib/email-config";
import DigestEmail, { digestSubject } from "@/emails/digest";
import {
  nextOccurrence,
  formatEventDate,
  daysBetween,
  isRateLimitError,
  emptyCronResults,
} from "@/lib/reminders";

/**
 * GET /api/cron/digest
 *
 * 1st of each month via Vercel Cron. Sends a digest of upcoming events (next 30
 * days) to each verified user who has digest enabled. Skips users with no
 * upcoming events (no empty digests).
 *
 * Resilience: 429 handling stops processing immediately.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, monthly_digest, timezone")
          .eq("id", user.id)
          .single();

        if (profile?.monthly_digest === false) {
          results.skipped++;
          continue;
        }

        const firstName = profile?.display_name?.split(" ")[0] || "there";

        const { data: events } = await supabase
          .from("events")
          .select(`
            id, event_type, event_label, month, day,
            contact_id,
            contacts!inner ( id, first_name, last_name, deleted_at )
          `)
          .eq("user_id", user.id)
          .is("contacts.deleted_at", null);

        if (!events || events.length === 0) {
          results.skipped++;
          continue;
        }

        const upcomingEvents = events
          .map((event) => {
            const contact = event.contacts as any;
            const eventDate = nextOccurrence(event.month, event.day, now);
            const daysUntil = daysBetween(now, eventDate);
            return { event, contact, daysUntil, eventDate };
          })
          .filter((e) => e.daysUntil >= 0 && e.daysUntil <= 30)
          .sort((a, b) => a.daysUntil - b.daysUntil);

        if (upcomingEvents.length === 0) {
          results.skipped++;
          continue;
        }

        const monthName = now.toLocaleDateString("en-US", { month: "long" });
        const subject = digestSubject(monthName);

        const { error: emailError } = await resend().emails.send({
          from: EMAIL_CONFIG.from,
          to: userEmail,
          replyTo: EMAIL_CONFIG.replyTo,
          subject,
          react: DigestEmail({
            firstName,
            monthName,
            events: upcomingEvents.map((e) => ({
              contactName: `${e.contact.first_name}${e.contact.last_name ? " " + e.contact.last_name : ""}`,
              eventType: e.event.event_type as "birthday" | "anniversary" | "custom",
              eventLabel: e.event.event_label,
              dateFormatted: formatEventDate(e.event.month, e.event.day),
              daysUntil: e.daysUntil,
              contactId: e.contact.id,
            })),
            userId: user.id,
          }),
          headers: EMAIL_CONFIG.headers({
            userId: user.id,
            reminderType: "digest",
          }),
        });

        if (emailError) {
          if (isRateLimitError(emailError)) {
            results.rateLimited = true;
            results.deferred++;
            break;
          }
          results.errors.push(`User ${user.id}: ${emailError.message}`);
          continue;
        }

        results.sent++;
      } catch (userError: any) {
        results.errors.push(`User ${user.id}: ${userError.message}`);
      }
    }

    return NextResponse.json({ ok: true, ...results, timestamp: now.toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
