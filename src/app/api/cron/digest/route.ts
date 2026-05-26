import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG } from "@/lib/email-config";
import DigestEmail, { digestSubject } from "@/emails/digest";

// Vercel Hobby defaults to 10s — not enough for multi-user cron processing.
export const maxDuration = 60;

import {
  nextOccurrence,
  formatEventDate,
  daysBetween,
  isRateLimitError,
  emptyCronResults,
} from "@/lib/reminders";
import { compareTokens } from "@/lib/utils";
import { buildSignedUrl } from "@/lib/tokens";

/**
 * GET /api/cron/digest
 *
 * Monthly via GitHub Actions (fires on 1st–2nd of each month for resilience).
 * Sends a digest of upcoming events (next 30 days) to each verified user who
 * has digest enabled. Skips users with no upcoming events (no empty digests).
 *
 * Resilience: Dedup via `profiles.last_digest_sent` (skips if already sent this
 * calendar month). Resend idempotency key as belt-and-suspenders. 429 handling
 * stops processing immediately.
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
  const results = emptyCronResults();

  try {
    // Paginate listUsers — Supabase returns max 1000 per page
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error: usersError } = await supabase.auth.admin.listUsers({ page, perPage });
      if (usersError) throw usersError;
      allUsers.push(...data.users);
      if (data.users.length < perPage) break;
      page++;
    }

    const verifiedUsers = allUsers.filter((u) => !!u.email_confirmed_at);

    for (const user of verifiedUsers) {
      if (results.rateLimited) break;

      try {
        const userEmail = user.email;
        if (!userEmail) continue;

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, monthly_digest_enabled, timezone, consent_terms, consent_emails, last_digest_sent")
          .eq("id", user.id)
          .single();

        // Skip users who haven't consented — required for Amazon affiliate compliance
        if (!profile?.consent_terms || !profile?.consent_emails) {
          results.skipped++;
          continue;
        }

        if (!profile?.monthly_digest_enabled) {
          results.skipped++;
          continue;
        }

        // Dedup: skip if we already sent a digest this calendar month.
        // The cron fires on every hourly run during the 1st–2nd of the month,
        // so this check prevents duplicate digests across those ~48 runs.
        if (profile.last_digest_sent) {
          const lastSent = new Date(profile.last_digest_sent);
          if (lastSent.getUTCFullYear() === now.getUTCFullYear() && lastSent.getUTCMonth() === now.getUTCMonth()) {
            results.skipped++;
            continue;
          }
        }

        const firstName = profile?.display_name?.split(" ")[0] || "there";

        // Digest runs on 1st of month, looks 30 days ahead
        // Fetch events for current month and next month (handle Dec->Jan rollover)
        const currentMonth = now.getMonth() + 1; // 1-12
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;

        const { data: events } = await supabase
          .from("events")
          .select(`
            id, event_type, event_label, month, day,
            contact_id,
            contacts!inner ( id, first_name, last_name, deleted_at )
          `)
          .eq("user_id", user.id)
          .in("month", [currentMonth, nextMonth])
          .is("deleted_at", null)
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

        // Idempotency key scoped to user + month — Resend deduplicates within its
        // window, and last_digest_sent covers the full month.
        const digestYear = now.getUTCFullYear();
        const digestMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
        const idempotencyKey = `ds-digest-${user.id}-${digestYear}-${digestMonth}`;

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
            unsubscribeUrl: buildSignedUrl(user.id, "unsubscribe"),
          }),
          headers: {
            ...EMAIL_CONFIG.headers({
              userId: user.id,
              reminderType: "digest",
            }),
            "Idempotency-Key": idempotencyKey,
          },
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

        // Mark digest as sent for this month — prevents duplicates on future runs.
        await supabase
          .from("profiles")
          .update({ last_digest_sent: now.toISOString() })
          .eq("id", user.id);

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
