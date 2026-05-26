import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import {
  EMAIL_CONFIG,
  DEFAULT_SEND_HOUR,
  DEFAULT_TIMEZONE,
  MAX_RETRY_ATTEMPTS,
  FAILED_RETRY_INTERVAL_MS,
} from "@/lib/email-config";
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

// Vercel Hobby defaults to 10s — not enough for multi-user cron processing.
export const maxDuration = 60;

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
          .select("display_name, timezone, preferred_send_hour, consent_terms, consent_emails, email_reminders_enabled, reminder_days_before")
          .eq("id", user.id)
          .single();

        // Skip users who haven't consented — required for Amazon affiliate compliance
        if (!profile?.consent_terms || !profile?.consent_emails) {
          results.skipped++;
          continue;
        }

        // Skip users who have disabled event reminders in settings
        if (profile.email_reminders_enabled === false) {
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
          // Block on statuses where the email actually reached Resend's
          // pipeline (live + bounced). Stale "pending" rows (>5 min old)
          // are marked "expired" and retried. "failed", "deferred", and
          // "expired" rows do not block — they're picked up by Pass 2b
          // for hourly retries (subject to MAX_RETRY_ATTEMPTS).
          // "bounced" is terminal: the recipient address rejected delivery
          // (bad address, suppression list, mailbox full, spam complaint),
          // and retrying would just re-bounce and damage sender reputation.
          // Predicate must stay aligned with idx_reminder_log_dedup
          // partial index (migration 021).
          const { data: existing } = await supabase
            .from("reminder_log")
            .select("id, status, created_at")
            .eq("user_id", user.id)
            .eq("event_id", event.id)
            .eq("days_before", window.canonicalDaysBefore)
            .eq("event_date", eventDateStr)
            .in("status", ["sent", "delivered", "opened", "clicked", "pending", "bounced"])
            .maybeSingle();

          if (existing) {
            if (existing.status === "pending") {
              const ageMs = now.getTime() - new Date(existing.created_at).getTime();
              if (ageMs > 5 * 60 * 1000) {
                // Stale pending — mark expired so retry can proceed.
                // Surface any error: silent UPDATE failures here are what
                // hid the migration-003 / migration-020 status mismatch in
                // production for months. See migration 020 header.
                const { error: expireError } = await supabase
                  .from("reminder_log")
                  .update({ status: "expired" })
                  .eq("id", existing.id);
                if (expireError) {
                  results.errors.push(
                    `User ${user.id}, event ${event.id}: failed to mark stale pending as expired — ${expireError.message}`
                  );
                  // Don't proceed to insert a new pending row — the partial
                  // unique index covers (pending,sent,delivered,opened,
                  // clicked,bounced), so if the existing row didn't
                  // transition out of 'pending', a fresh INSERT would
                  // 23505 anyway.
                  continue;
                }
              } else {
                // Fresh pending — another run may be in-flight, don't interfere
                results.skipped++;
                continue;
              }
            } else {
              // sent/delivered/opened/clicked — successfully sent, skip.
              // bounced — terminal failure (bad address etc.), do not retry.
              results.skipped++;
              continue;
            }
          }

          // ── Retry cap: don't retry past MAX_RETRY_ATTEMPTS ──────────────
          // Counts failed + expired + deferred for this (user, event,
          // event_date) tuple. See email-config.ts for tuning rationale.
          const { count: failedCount } = await supabase
            .from("reminder_log")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("event_id", event.id)
            .eq("event_date", eventDateStr)
            .in("status", ["failed", "expired", "deferred"]);

          if ((failedCount || 0) >= MAX_RETRY_ATTEMPTS) {
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

    // ══════════════════════════════════════════════════════════════════════════
    // PASS 2: Recovery phases — run regardless of send-hour gating.
    //
    //   2a. Stale pending recovery: rows stuck at 'pending' for >5 minutes
    //       (function killed mid-send, missed cron, etc.). Expire and retry.
    //
    //   2b. Hourly retry of failed/deferred: rows in terminal-but-recoverable
    //       states older than FAILED_RETRY_INTERVAL_MS get re-attempted, up
    //       to MAX_RETRY_ATTEMPTS total (counting failed + expired + deferred).
    //       'bounced' rows are NOT retried — bounces indicate permanent
    //       delivery failure (bad address, suppression list, mailbox full).
    //
    // Pass 2b dedupes by (user_id, event_id, days_before, event_date) tuple,
    // processing the most recent failure per tuple. The MAX_RETRY_ATTEMPTS
    // cap is enforced inside attemptRetry().
    // ══════════════════════════════════════════════════════════════════════════

    // ── Pass 2a — stale pending recovery ────────────────────────────────────
    if (!results.rateLimited) {
      const STALE_THRESHOLD = new Date(now.getTime() - 5 * 60 * 1000);

      const { data: staleRows } = await supabase
        .from("reminder_log")
        .select("id, user_id, event_id, contact_id, days_before, event_date")
        .eq("status", "pending")
        .lt("created_at", STALE_THRESHOLD.toISOString());

      for (const staleRow of staleRows ?? []) {
        if (results.rateLimited) break;

        try {
          // Mark as expired before retrying. Surface any error: silent
          // UPDATE failures here previously hid a check-constraint mismatch
          // (status='expired' was not in the allowed set until migration
          // 020). The partial dedup index added in migration 020 expects
          // this transition out of 'pending' before the retry INSERT.
          const { error: expireError } = await supabase
            .from("reminder_log")
            .update({ status: "expired" })
            .eq("id", staleRow.id);
          if (expireError) {
            results.errors.push(
              `Retry stale row ${staleRow.id}: failed to mark as expired — ${expireError.message}`
            );
            continue;
          }

          await attemptRetry(supabase, staleRow, now, results);
        } catch (retryError: any) {
          results.errors.push(`Retry stale row ${staleRow.id}: ${retryError.message}`);
        }
      }
    }

    // ── Pass 2b — hourly retry of failed/deferred rows ──────────────────────
    if (!results.rateLimited) {
      const RETRY_THRESHOLD = new Date(now.getTime() - FAILED_RETRY_INTERVAL_MS);
      // Bound the lookback so the query doesn't scan ancient history. Any
      // tuple older than 24h has either hit the retry cap or has an
      // event_date in the past — nothing left to do.
      const LOOKBACK = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Query terminal-but-recoverable rows ordered DESC by created_at.
      // The in-memory dedup below picks the MOST RECENT attempt per tuple,
      // whose age determines cooldown eligibility.
      const { data: retriableRows } = await supabase
        .from("reminder_log")
        .select("id, user_id, event_id, contact_id, days_before, event_date, created_at, status")
        .in("status", ["failed", "deferred"])
        .gte("created_at", LOOKBACK.toISOString())
        .order("created_at", { ascending: false });

      type RetriableRow = NonNullable<typeof retriableRows>[number];
      const latestByTuple = new Map<string, RetriableRow>();
      for (const row of retriableRows ?? []) {
        const tupleKey = `${row.user_id}:${row.event_id}:${row.days_before}:${row.event_date}`;
        // First write wins because the query is DESC; later rows for the
        // same tuple are older attempts we don't want to use for cooldown.
        if (!latestByTuple.has(tupleKey)) latestByTuple.set(tupleKey, row);
      }

      for (const latestRow of latestByTuple.values()) {
        if (results.rateLimited) break;

        // Cooldown check: most recent attempt must be older than the
        // configured interval. Skip silently if not yet eligible.
        if (new Date(latestRow.created_at) >= RETRY_THRESHOLD) continue;

        try {
          // Race-protection: another concurrent cron run may have already
          // started a retry for this tuple, or a webhook may have marked
          // the original send as bounced (terminal). The partial unique
          // index would catch the former on INSERT (23505), but a pre-check
          // avoids the wasted Resend call and noisy error. 'bounced' is
          // included so a webhook-bounced row blocks any retry attempt.
          const { data: liveRow } = await supabase
            .from("reminder_log")
            .select("id")
            .eq("user_id", latestRow.user_id)
            .eq("event_id", latestRow.event_id)
            .eq("days_before", latestRow.days_before)
            .eq("event_date", latestRow.event_date)
            .in("status", ["pending", "sent", "delivered", "opened", "clicked", "bounced"])
            .maybeSingle();

          if (liveRow) {
            results.skipped++;
            continue;
          }

          await attemptRetry(supabase, latestRow, now, results);
        } catch (retryError: any) {
          results.errors.push(`Retry failed row ${latestRow.id}: ${retryError.message}`);
        }
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

// ── Retry helper ────────────────────────────────────────────────────────────
//
// Attempt a single retry send for a previously-failed reminder. Used by both
// Pass 2a (stale-pending recovery, after expiring the source row) and Pass 2b
// (failed/deferred recovery). Mutates `results` and sets `results.rateLimited`
// on 429 so the caller can break its loop.
//
// Caller responsibilities:
//   - For stale 'pending' rows, transition the source row to 'expired' first.
//   - Confirm no live row exists for this tuple (Pass 2b does this explicitly;
//     Pass 2a relies on the source row's own status having moved to 'expired').

async function attemptRetry(
  supabase: any,
  sourceRow: {
    id: string;
    user_id: string;
    event_id: string;
    contact_id: string;
    days_before: number;
    event_date: string;
  },
  now: Date,
  results: CronResults
): Promise<void> {
  // 1. Don't retry a reminder whose event_date is in the past. For recurring
  //    events the next year is a separate (user_id, event_id, days_before,
  //    event_date) tuple handled by a fresh Pass 1 send. For one-time events
  //    the event simply happened — no point sending the reminder now.
  //    Compare against UTC midnight today; event_date is a DATE without TZ.
  const todayUtcMidnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  ));
  if (new Date(sourceRow.event_date) < todayUtcMidnight) {
    results.skipped++;
    return;
  }

  // 2. Retry cap: failed + expired + deferred (see MAX_RETRY_ATTEMPTS).
  const { count: failedCount } = await supabase
    .from("reminder_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", sourceRow.user_id)
    .eq("event_id", sourceRow.event_id)
    .eq("event_date", sourceRow.event_date)
    .in("status", ["failed", "expired", "deferred"]);

  if ((failedCount || 0) >= MAX_RETRY_ATTEMPTS) {
    results.skipped++;
    return;
  }

  // 3. Refetch user — they may have unverified email or been deleted.
  const { data: retryUser } = await supabase.auth.admin.getUserById(sourceRow.user_id);
  if (!retryUser?.user?.email || !retryUser.user.email_confirmed_at) return;

  // 4. Refetch profile — consent / reminders-enabled may have changed.
  const { data: retryProfile } = await supabase
    .from("profiles")
    .select("display_name, timezone, consent_terms, consent_emails, email_reminders_enabled")
    .eq("id", sourceRow.user_id)
    .single();

  if (!retryProfile?.consent_terms || !retryProfile?.consent_emails) return;
  if (retryProfile.email_reminders_enabled === false) return;

  // 5. Refetch event — may have been soft-deleted.
  const { data: retryEvent } = await supabase
    .from("events")
    .select(`
      id, event_type, event_label, month, day, high_importance, suppress_gifts,
      one_time, event_year, contact_id, user_id,
      contacts!inner ( id, first_name, last_name, relationship, gender, has_pets, gift_categories, gift_other, budget_tier, deleted_at )
    `)
    .eq("id", sourceRow.event_id)
    .is("deleted_at", null)
    .is("contacts.deleted_at", null)
    .single();

  if (!retryEvent) return;

  const retryContact = retryEvent.contacts as any;
  const retryTimezone = retryProfile.timezone || DEFAULT_TIMEZONE;
  const { daysUntil, eventYear } = calendarDaysUntil(now, retryEvent.month, retryEvent.day, retryTimezone);

  // 6. Re-select gifts and build email content.
  const gifts = await selectGiftsScored(supabase, retryContact, retryEvent, daysUntil, eventYear);
  const contactFirstName = retryContact.first_name || "Someone";
  const eventDateFormatted = formatEventDate(retryEvent.month, retryEvent.day);
  const firstName = retryProfile.display_name?.split(" ")[0] || "there";
  const lastYearLine = await getLastYearLine(
    supabase,
    retryContact.id,
    retryEvent.month,
    retryEvent.day,
    eventYear
  );

  const { data: override } = await supabase
    .from("email_overrides")
    .select("custom_message")
    .eq("user_id", sourceRow.user_id)
    .eq("event_id", sourceRow.event_id)
    .eq("days_before", sourceRow.days_before)
    .eq("event_year", eventYear)
    .maybeSingle();

  const customMessage = override?.custom_message || null;
  const isLateSend = daysUntil !== sourceRow.days_before;
  const eventDateStr = sourceRow.event_date;

  // 7. Insert new pending row for this retry attempt.
  const { data: pendingRow, error: pendingError } = await supabase
    .from("reminder_log")
    .insert({
      user_id: sourceRow.user_id,
      event_id: sourceRow.event_id,
      contact_id: sourceRow.contact_id,
      days_before: sourceRow.days_before,
      event_date: eventDateStr,
      status: "pending",
      gift_ids: gifts.map((g: any) => g.id),
    })
    .select("id")
    .single();

  if (pendingError) {
    if (pendingError.code === "23505") {
      // Another concurrent retry already inserted a live row for this tuple.
      results.skipped++;
      return;
    }
    results.errors.push(
      `Retry user ${sourceRow.user_id}, event ${sourceRow.event_id}: pending insert failed — ${pendingError.message}`
    );
    return;
  }

  // 8. Send via Resend with a retry-suffixed idempotency key.
  const idempotencyKey =
    buildIdempotencyKey(sourceRow.user_id, sourceRow.event_id, sourceRow.days_before, eventDateStr) +
    `-retry-${Date.now()}`;
  const subject = reminderSubject(contactFirstName, retryEvent.event_type, daysUntil, retryEvent.event_label);

  const { data: emailResult, error: emailError } = await resend().emails.send({
    from: EMAIL_CONFIG.from,
    to: retryUser.user.email,
    replyTo: EMAIL_CONFIG.replyTo,
    subject,
    react: ReminderEmail({
      firstName,
      contactFirstName,
      eventType: retryEvent.event_type as "birthday" | "anniversary" | "custom",
      eventLabel: retryEvent.event_label,
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
      suppressGifts: retryEvent.suppress_gifts,
      lastYearLine,
      customMessage,
      contactId: retryContact.id,
      userId: sourceRow.user_id,
      unsubscribeUrl: buildSignedUrl(sourceRow.user_id, "unsubscribe"),
    }),
    headers: {
      ...EMAIL_CONFIG.headers({
        userId: sourceRow.user_id,
        reminderType: retryEvent.event_type,
        partner: gifts[0]?.partner || "daysight",
        reminderId: retryEvent.id,
      }),
      "Idempotency-Key": idempotencyKey,
    },
  });

  // 9. Handle outcome.
  if (emailError) {
    if (isRateLimitError(emailError)) {
      await supabase.from("reminder_log").update({ status: "deferred" }).eq("id", pendingRow.id);
      results.rateLimited = true;
      results.deferred++;
      return;
    }
    await supabase.from("reminder_log").update({ status: "failed" }).eq("id", pendingRow.id);
    results.errors.push(`Retry user ${sourceRow.user_id}, event ${sourceRow.event_id}: ${emailError.message}`);
    return;
  }

  await supabase
    .from("reminder_log")
    .update({ status: "sent", resend_id: emailResult?.id || null, sent_at: new Date().toISOString() })
    .eq("id", pendingRow.id);

  for (const gift of gifts) {
    await supabase.from("shown_gifts").insert({
      user_id: sourceRow.user_id,
      contact_id: sourceRow.contact_id,
      event_id: sourceRow.event_id,
      gift_id: gift.id,
      event_month: retryEvent.month,
      event_day: retryEvent.day,
      year: eventYear,
      gift_name: gift.name,
      gift_category: gift.category,
      gift_partner: gift.partner,
    });
  }

  results.sent++;
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
