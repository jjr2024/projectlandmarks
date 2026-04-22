import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG } from "@/lib/email-config";
import ReminderEmail, { reminderSubject } from "@/emails/reminder";
import {
  nextOccurrence,
  formatEventDate,
  daysBetween,
  buildEventDateStr,
  matchReminderWindow,
  buildIdempotencyKey,
  buildLastYearLine,
  isRateLimitError,
  emptyCronResults,
  MAX_EMAILS_PER_USER_PER_DAY,
  type CronResults,
} from "@/lib/reminders";
import { selectGiftsScored } from "@/lib/gift-engine";

/**
 * GET /api/cron/reminders
 *
 * Daily via Vercel Cron. For each verified user, finds events within reminder
 * windows, sends emails via Resend, logs to reminder_log + shown_gifts.
 *
 * RESILIENCE (see CLAUDE.md § Email Resilience):
 *  1. Pre-send logging — 'pending' row before Resend call; updated to 'sent'/'failed' after.
 *  2. Idempotency key — deterministic key prevents Resend from sending dupes.
 *  3. Range-based windows — missed cron days caught within ±2 day range.
 *  4. Per-user send cap — max 3 emails/user/24h; excess deferred to next run.
 *  5. 429 handling — stops processing immediately on rate limit.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results: CronResults = emptyCronResults();

  try {
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const verifiedUsers = users.users.filter((u) => !!u.email_confirmed_at);

    for (const user of verifiedUsers) {
      // Stop all processing if we've been rate-limited
      if (results.rateLimited) break;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, timezone, preferred_send_hour")
          .eq("id", user.id)
          .single();

        const firstName = profile?.display_name?.split(" ")[0] || "there";
        const userEmail = user.email;
        if (!userEmail) continue;

        // ── Per-user send cap ──────────────────────────────────────────
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { count: recentSendCount } = await supabase
          .from("reminder_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["sent", "delivered", "opened", "clicked"])
          .gte("sent_at", twentyFourHoursAgo.toISOString());

        let userSendsThisRun = 0;
        const userAtCap = (recentSendCount || 0) + userSendsThisRun >= MAX_EMAILS_PER_USER_PER_DAY;
        if (userAtCap) {
          results.deferred++;
          continue;
        }

        // ── Fetch user's events (with non-deleted contacts) ────────────
        const { data: events } = await supabase
          .from("events")
          .select(`
            id, event_type, event_label, month, day, high_importance, suppress_gifts,
            contact_id, user_id,
            contacts!inner ( id, first_name, last_name, gift_categories, gift_other, budget_tier, deleted_at )
          `)
          .eq("user_id", user.id)
          .is("contacts.deleted_at", null);

        if (!events || events.length === 0) continue;

        for (const event of events) {
          if (results.rateLimited) break;

          // Check per-user cap mid-loop (may have sent some already this iteration)
          if ((recentSendCount || 0) + userSendsThisRun >= MAX_EMAILS_PER_USER_PER_DAY) {
            results.deferred++;
            continue;
          }

          const contact = event.contacts as any;
          const eventDate = nextOccurrence(event.month, event.day, now);
          const daysUntil = daysBetween(now, eventDate);

          // ── Range-based window matching ────────────────────────────────
          const window = matchReminderWindow(daysUntil, event.high_importance);
          if (!window) continue;

          const eventDateStr = buildEventDateStr(now.getFullYear(), event.month, event.day);

          // ── Dedup: check reminder_log for existing entry ───────────────
          // Matches on canonical days_before (21/7/3), not actual daysUntil.
          const { data: existing } = await supabase
            .from("reminder_log")
            .select("id")
            .eq("user_id", user.id)
            .eq("event_id", event.id)
            .eq("days_before", window.canonicalDaysBefore)
            .eq("event_date", eventDateStr)
            .maybeSingle();

          if (existing) {
            results.skipped++;
            continue;
          }

          // ── Select gifts (scored engine — Phase 6) ────────────────────
          const gifts = await selectGiftsScored(supabase, contact, event, daysUntil, now.getFullYear());

          const contactFirstName = contact.first_name || "Someone";
          const eventDateFormatted = formatEventDate(event.month, event.day);
          const lastYearLine = await getLastYearLine(supabase, contact.id, event.month, event.day, now.getFullYear());

          // ── Check for admin custom message override ────────────────────
          const { data: override } = await supabase
            .from("email_overrides")
            .select("custom_message")
            .eq("user_id", user.id)
            .eq("event_id", event.id)
            .eq("days_before", window.canonicalDaysBefore)
            .eq("event_year", now.getFullYear())
            .maybeSingle();

          const customMessage = override?.custom_message || null;

          // ── 1. Pre-send: write 'pending' row ───────────────────────────
          const { data: pendingRow, error: pendingError } = await supabase
            .from("reminder_log")
            .insert({
              user_id: user.id,
              event_id: event.id,
              contact_id: contact.id,
              days_before: window.canonicalDaysBefore,
              event_date: eventDateStr,
              status: "pending",
              gift_ids: gifts.map((g: any) => g.id),
            })
            .select("id")
            .single();

          if (pendingError) {
            // Unique constraint violation = already logged (race condition or retry). Skip.
            if (pendingError.code === "23505") {
              results.skipped++;
              continue;
            }
            results.errors.push(`User ${user.id}, event ${event.id}: pending insert failed — ${pendingError.message}`);
            continue;
          }

          // ── 2. Send via Resend with idempotency key ────────────────────
          const idempotencyKey = buildIdempotencyKey(user.id, event.id, window.canonicalDaysBefore, eventDateStr);
          const subject = reminderSubject(contactFirstName, event.event_type, window.canonicalDaysBefore);

          const { data: emailResult, error: emailError } = await resend().emails.send({
            from: EMAIL_CONFIG.from,
            to: userEmail,
            replyTo: EMAIL_CONFIG.replyTo,
            subject,
            react: ReminderEmail({
              firstName,
              contactFirstName,
              eventType: event.event_type as "birthday" | "anniversary" | "custom",
              eventLabel: event.event_label,
              daysBefore: window.canonicalDaysBefore,
              eventDateFormatted,
              gifts: gifts.map((g: any) => ({
                name: g.name,
                partner: g.partner,
                description: g.tags?.join(", ") || "",
                price: g.price_tier === "low" ? "Under $30" : g.price_tier === "mid" ? "$30-75" : "$75+",
                affiliate_url: g.affiliate_url || "#",
              })),
              suppressGifts: event.suppress_gifts,
              lastYearLine,
              customMessage,
              contactId: contact.id,
              userId: user.id,
            }),
            headers: {
              ...EMAIL_CONFIG.headers({
                userId: user.id,
                reminderType: event.event_type,
                partner: gifts[0]?.partner || "daysight",
                reminderId: event.id,
              }),
              "Idempotency-Key": idempotencyKey,
            },
          });

          // ── 3. Update pending row based on outcome ─────────────────────
          if (emailError) {
            // Check for rate limit — stop all processing
            if (isRateLimitError(emailError)) {
              await supabase
                .from("reminder_log")
                .update({ status: "deferred" })
                .eq("id", pendingRow.id);
              results.rateLimited = true;
              results.deferred++;
              break;
            }

            // Other send failure — mark as failed
            await supabase
              .from("reminder_log")
              .update({ status: "failed" })
              .eq("id", pendingRow.id);
            results.errors.push(`User ${user.id}, event ${event.id}: ${emailError.message}`);
            continue;
          }

          // Success — update to 'sent' with Resend ID
          await supabase
            .from("reminder_log")
            .update({
              status: "sent",
              resend_id: emailResult?.id || null,
              sent_at: new Date().toISOString(),
            })
            .eq("id", pendingRow.id);

          // Log shown gifts
          for (const gift of gifts) {
            await supabase.from("shown_gifts").insert({
              user_id: user.id,
              contact_id: contact.id,
              event_id: event.id,
              gift_id: gift.id,
              event_month: event.month,
              event_day: event.day,
              year: now.getFullYear(),
              gift_name: gift.name,
              gift_category: gift.category,
              gift_partner: gift.partner,
            });
          }

          results.sent++;
          userSendsThisRun++;
        }
      } catch (userError: any) {
        results.errors.push(`User ${user.id}: ${userError.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Last-year-line (DB query + sentence builder) ────────────────────────────

async function getLastYearLine(
  supabase: any,
  contactId: string,
  month: number,
  day: number,
  currentYear: number
): Promise<string | null> {
  const { data: history } = await supabase
    .from("shown_gifts")
    .select("gift_name")
    .eq("contact_id", contactId)
    .eq("event_month", month)
    .eq("event_day", day)
    .eq("year", currentYear - 1)
    .limit(5);

  if (!history || history.length === 0) return null;
  return buildLastYearLine(history.map((h: any) => h.gift_name));
}
