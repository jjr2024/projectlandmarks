import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG, REMINDER_WINDOWS } from "@/lib/email-config";
import ReminderEmail, { reminderSubject } from "@/emails/reminder";

/**
 * GET /api/cron/reminders
 *
 * Runs daily via Vercel Cron. For each verified user, finds events that fall
 * within a reminder window (21/7/3 days before), selects gifts from the catalog,
 * sends the reminder email via Resend, and logs to reminder_log + shown_gifts.
 *
 * Security: requires CRON_SECRET header to prevent unauthorized invocation.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const results: { sent: number; skipped: number; errors: string[] } = {
    sent: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get all verified users with their profiles
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const verifiedUsers = users.users.filter((u) => !!u.email_confirmed_at);

    for (const user of verifiedUsers) {
      try {
        // Get user profile for display name, timezone, send hour, digest prefs
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, timezone, preferred_send_hour")
          .eq("id", user.id)
          .single();

        const firstName = profile?.display_name?.split(" ")[0] || "there";
        const userEmail = user.email;
        if (!userEmail) continue;

        // Get all active events for this user (with non-deleted contacts)
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

        // Check each event against reminder windows
        for (const event of events) {
          const contact = event.contacts as any;
          const eventDate = nextOccurrence(event.month, event.day, now);
          const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          // Determine which reminder windows apply
          const windows: number[] = [REMINDER_WINDOWS.STANDARD, REMINDER_WINDOWS.URGENT];
          if (event.high_importance) {
            windows.unshift(REMINDER_WINDOWS.HIGH_IMPORTANCE);
          }

          // Check if today matches any reminder window
          if (!windows.includes(daysUntil)) continue;

          // Build event_date string for dedup
          const eventDateStr = `${now.getFullYear()}-${String(event.month).padStart(2, "0")}-${String(event.day).padStart(2, "0")}`;

          // Dedup: check if we already sent this reminder
          const { data: existing } = await supabase
            .from("reminder_log")
            .select("id")
            .eq("user_id", user.id)
            .eq("event_id", event.id)
            .eq("days_before", daysUntil)
            .eq("event_date", eventDateStr)
            .maybeSingle();

          if (existing) {
            results.skipped++;
            continue;
          }

          // Select gifts from catalog
          const gifts = await selectGifts(supabase, contact, event, daysUntil);

          const contactFirstName = contact.first_name || "Someone";
          const contactName = `${contact.first_name}${contact.last_name ? " " + contact.last_name : ""}`;
          const eventDateFormatted = formatEventDate(event.month, event.day);

          // Get last year's shown gifts for the "last year we suggested" line
          const lastYearLine = await getLastYearLine(supabase, contact.id, event.month, event.day, now.getFullYear());

          // Send via Resend
          const subject = reminderSubject(contactFirstName, event.event_type, daysUntil);
          const { data: emailResult, error: emailError } = await resend.emails.send({
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
              gifts: gifts.map((g: any) => ({
                name: g.name,
                partner: g.partner,
                description: g.tags?.join(", ") || "",
                price: g.price_tier === "low" ? "Under $30" : g.price_tier === "mid" ? "$30-75" : "$75+",
                affiliate_url: g.affiliate_url || "#",
              })),
              suppressGifts: event.suppress_gifts,
              lastYearLine,
              contactId: contact.id,
              userId: user.id,
            }),
            headers: EMAIL_CONFIG.headers({
              userId: user.id,
              reminderType: event.event_type,
              partner: gifts[0]?.partner || "daysight",
              reminderId: event.id,
            }),
          });

          if (emailError) {
            results.errors.push(`User ${user.id}, event ${event.id}: ${emailError.message}`);
            continue;
          }

          // Log to reminder_log
          await supabase.from("reminder_log").insert({
            user_id: user.id,
            event_id: event.id,
            contact_id: contact.id,
            days_before: daysUntil,
            event_date: eventDateStr,
            resend_id: emailResult?.id || null,
            status: "sent",
            gift_ids: gifts.map((g: any) => g.id),
          });

          // Log to shown_gifts
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

/**
 * Calculate the next occurrence of a month/day from a given date.
 */
function nextOccurrence(month: number, day: number, from: Date): Date {
  const thisYear = from.getFullYear();
  let d = new Date(thisYear, month - 1, day);
  // If the date already passed this year, use next year
  if (d < from) {
    d = new Date(thisYear + 1, month - 1, day);
  }
  return d;
}

/**
 * Format month/day into a human-readable string like "May 15".
 */
function formatEventDate(month: number, day: number): string {
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/**
 * Select up to 3 gift items from the catalog, matched to contact preferences.
 */
async function selectGifts(supabase: any, contact: any, event: any, daysUntil: number) {
  const isLastMinute = daysUntil <= REMINDER_WINDOWS.LAST_MINUTE;
  const categories = contact.gift_categories?.length > 0
    ? contact.gift_categories
    : ["flowers", "gift_card"];

  let query = supabase
    .from("gift_catalog")
    .select("*")
    .eq("is_active", true)
    .in("category", categories);

  if (isLastMinute) {
    query = query.eq("is_last_minute", true);
  }

  if (contact.budget_tier) {
    query = query.eq("price_tier", contact.budget_tier);
  }

  const { data: gifts } = await query.limit(6);

  // If we got results, return up to 3; otherwise fall back to any active gifts
  if (gifts && gifts.length > 0) {
    return gifts.slice(0, 3);
  }

  // Fallback: get any 3 active gifts
  const { data: fallback } = await supabase
    .from("gift_catalog")
    .select("*")
    .eq("is_active", true)
    .eq("is_last_minute", isLastMinute)
    .limit(3);

  return fallback || [];
}

/**
 * Build the "Last year we suggested..." line from shown_gifts history.
 */
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

  const names = history.map((h: any) => h.gift_name);
  if (names.length === 1) return `Last year we suggested ${names[0]}.`;
  if (names.length === 2) return `Last year we suggested ${names[0]} and ${names[1]}.`;
  return `Last year we suggested ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}.`;
}
