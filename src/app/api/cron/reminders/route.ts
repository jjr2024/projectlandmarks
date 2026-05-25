import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG, DEFAULT_SEND_HOUR, DEFAULT_TIMEZONE } from "@/lib/email-config";
import ReminderEmail, { reminderSubject } from "@/emails/reminder";
import {
  formatEventDate,
  calendarDaysUntil,
  localHour,
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
import { compareTokens } from "@/lib/utils";
import { buildSignedUrl } from "@/lib/tokens";

/**
 * GET /api/cron/reminders
 *
 * Hourly via Vercel Cron. For each verified user whose current local hour
 * matches their preferred_send_hour, finds events within reminder windows,
 * sends emails via Resend, logs to reminder_log + shown_gifts.
 *
 * SEND-HOUR GATING: Cron runs every hour. Each run only processes users
 * whose local hour (in their timezone) matches their preferred_send_hour.
 * This ensures emails arrive at the user's chosen time regardless of timezone.
 *
 * TIMEZONE-AWARE DAY MATH: daysUntil is computed as calendar days in the
 * user's local timezone (May 25 → May 27 = 2, regardless of hour). This
 * prevents off-by-one errors for users far from UTC.
 *
 * RESILIENCE (see CLAUDE.md § Email Resilience):
 *  1. Pre-send logging — 'pending' row before Resend call; updated to 'sent'/'failed' after.
 *  2. Idempotency key — deterministic key prevents Resend from sending dupes.
 *  3. Range-based windows — per-user day preferences with late-side tolerance.
 *  4. Per-user send cap — max 3 emails/user/24h; excess deferred to next run.
 *  5. 429 handling — stops processing immediately on rate limit.
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
  const results: CronResults = emptyCronResults();

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
      // Stop all processing if we've been rate-limited
      if (results.rateLimited) break;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, timezone, preferred_send_hour, consent_terms, consent_emails, reminder_days_before")
          .eq("id", user.id)
          .single();

        // Skip users who haven't consented — required for Amazon affiliate compliance
        if (!profile?.consent_terms || !profile?.consent_emails) {
          results.skipped++;
          continue;
        }

        // ── Send-hour gating ────────────────────────────────────────────
        // Only process users whose current local hour matches their preferred hour.
        const userTimezone: string = profile.timezone || DEFAULT_TIMEZONE;
        const userSendHour: number = profile.preferred_send_hour ?? DEFAULT_SEND_HOUR;
        const currentLocalHour = localHour(now, userTimezone);
        if (currentLocalHour !== userSendHour) {
          // Not this user's send hour — skip silently (not an error or deferral)
          continue;
        }

        const firstName = profile?.display_name?.split(" ")[0] || "there";
        const userEmail = user.email;
        if (!userEmail) continue;

        // ── Per-user send cap ──────────────────────────────────────────
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { count: recentSendCount } = await supabase
          .from("reminder_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["pending", "sent", "delivered", "opened", "clicked"])
          .gte("created_at", twentyFourHoursAgo.toISOString());

        let userSendsThisRun = 0;
        const userAtCap = (recentSendCount || 0) >= MAX_EMAILS_PER_USER_PER_DAY;
        if (userAtCap) {
          results.deferred++;
          continue;
        }

        // ── Fetch user's events (with non-deleted contacts) ────────────
        const { data: events } = await supabase
          .from("events")
          .select(`
            id, event_type, event_label, month, day, high_importance, suppress_gifts,
            one_time, event_year, contact_id, user_id,
            contacts!inner ( id, first_name, last_name, relationship, gender, has_pets, gift_categories, gift_other, budget_tier, deleted_at )
          `)
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .is("contacts.deleted_at", null);

        if (!events || events.length === 0) continue;

        for (const event of events) {
          if (results.rateLimited) break;

          // Check per-user cap mid-loop
          if ((recentSendCount || 0) + userSendsThisRun >= MAX_EMAILS_PER_USER_PER_DAY) {
            results.deferred++;
            continue;
          }

          const contact = event.contacts as any;

          // ── Skip past one-time events ─────────────────────────────────
          if (event.one_time && event.event_year) {
            const oneTimeDate = new Date(event.event_year, event.month - 1, event.day);
            if (oneTimeDate < now) {
              results.skipped++;
              continue;
            }
          }

          // ── Timezone-aware calendar day math ──────────────────────────
          // daysUntil is pure calendar days in the user's timezone.
          // eventYear comes from the next occurrence (year-rollover safe).
          const { daysUntil, eventYear } = calendarDaysUntil(now, event.month, event.day, userTimezone);

          // ── Range-based window matching (respects user's reminder_days_before) ─
          const window = matchReminderWindow(daysUntil, event.high_importance, profile.reminder_days_before);
          if (!window) continue;

          const eventDateStr = buildEventDateStr(eventYear, event.month, event.day);

          // ── Dedup: check reminder_log for existing entry ───────────────
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
          const gifts = await selectGiftsScored(supabase, contact, event, daysUntil, eventYear);

          const contactFirstName = contact.first_name || "Someone";
          const eventDateFormatted = formatEventDate(event.month, event.day);
          const lastYearLine = await getLastYearLine(supabase, contact.id, event.month, event.day, eventYear);

          // ── Check for admin custom message override ────────────────────
          const { data: override } = await supabase
            .from("email_overrides")
            .select("custom_message")
            .eq("user_id", user.id)
            .eq("event_id", event.id)
            .eq("days_before", window.canonicalDaysBefore)
            .eq("event_year", eventYear)
            .maybeSingle();

          const customMessage = override?.custom_message || null;

          // ── Detect late send (actual days !== canonical) ───────────────
          const isLateSend = daysUntil !== window.canonicalDaysBefore;

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
            if (pendingError.code === "23505") {
              results.skipped++;
              continue;
            }
            results.errors.push(`User ${user.id}, event ${event.id}: pending insert failed — ${pendingError.message}`);
            continue;
          }

          // ── 2. Send via Resend with idempotency key ────────────────────
          const idempotencyKey = buildIdempotencyKey(user.id, event.id, window.canonicalDaysBefore, eventDateStr);
          const subject = reminderSubject(contactFirstName, event.event_type, daysUntil, event.event_label);

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
              daysBefore: daysUntil,
              eventDateFormatted,
              isLateSend,
              gifts: gifts.map((g) => ({
                name: g.name,
                partner: g.partner,
                description: g.description || g.tags?.join(", ") || "",
                price: g.price_tier === "low" ? "<$50" : g.price_tier === "mid" ? "$50–$100" : ">$100",
                affiliate_url: g.affiliate_url || "#",
                category: g.category,
                image_url: g.image_url || undefined,
              })),
              suppressGifts: event.suppress_gifts,
              lastYearLine,
              customMessage,
              contactId: contact.id,
              userId: user.id,
              unsubscribeUrl: buildSignedUrl(user.id, "unsubscribe"),
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
            if (isRateLimitError(emailError)) {
              await supabase
                .from("reminder_log")
                .update({ status: "deferred" })
                .eq("id", pendingRow.id);
              results.rateLimited = true;
              results.deferred++;
              break;
            }

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
              year: eventYear,
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
    .lt("year", currentYear)
    .order("year", { ascending: false })
    .limit(5);

  if (!history || history.length === 0) return null;
  return buildLastYearLine(history.map((h: any) => h.gift_name));
}
