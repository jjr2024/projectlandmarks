import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/tokens";

/**
 * GET /api/calendar/[userId]?token={hmac}
 *
 * Generates and returns a calendar feed (.ics file) for the user's events.
 * All events are rendered as all-day recurring annual events (RRULE:FREQ=YEARLY).
 *
 * Auth: HMAC-signed token in query param. Generated from settings page.
 * This endpoint is idempotent and cacheable.
 */

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface Event {
  id: string;
  contact_id: string;
  event_type: string;
  event_label: string;
  month: number;
  day: number;
  one_time: boolean;
  event_year: number | null;
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

/** Fold ICS lines longer than 75 octets per RFC 5545 §3.1 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  parts.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;

  // Validate userId is a proper UUID
  if (!userId || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
  }

  // Verify HMAC token from query param
  const token = request.nextUrl.searchParams.get("token");
  if (!token || !verifyToken(userId, token, "calendar")) {
    return NextResponse.json({ error: "Invalid or missing calendar token" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();

    // Fetch user's contacts (active only: deleted_at IS NULL)
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, first_name, last_name")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (contactsError) {
      console.error("Failed to fetch contacts:", contactsError);
      return NextResponse.json(
        { error: "Failed to fetch calendar data" },
        { status: 500 }
      );
    }

    // Fetch user's events
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, contact_id, event_type, event_label, month, day, one_time, event_year")
      .eq("user_id", userId)
      .is("deleted_at", null);

    if (eventsError) {
      console.error("Failed to fetch events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch calendar data" },
        { status: 500 }
      );
    }

    // Build map of contact_id -> contact for quick lookup
    const contactMap = new Map<string, Contact>();
    if (contacts) {
      for (const contact of contacts) {
        contactMap.set(contact.id, contact);
      }
    }

    // Generate iCalendar
    const icsLines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Daysight//Calendar Feed//EN",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:Daysight Reminders",
      "METHOD:PUBLISH",
    ];

    if (events) {
      for (const evt of events) {
        const contact = contactMap.get(evt.contact_id);
        if (!contact) continue;

        // Build summary: "Contact Name's Event Type"
        let summary = `${contact.first_name}`;
        if (contact.last_name) {
          summary += ` ${contact.last_name}`;
        }

        if (evt.event_type === "birthday") {
          summary += "'s Birthday";
        } else if (evt.event_type === "anniversary") {
          summary += "'s Anniversary";
        } else if (evt.event_type === "custom" && evt.event_label) {
          summary += `'s ${evt.event_label}`;
        } else {
          summary += "'s Event";
        }

        // Format date as YYYYMMDD.
        // One-time events use their stored event_year, or infer the next occurrence
        // if no year was set. Recurring events use the current year with RRULE:FREQ=YEARLY.
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        let eventYear: number;
        if (evt.one_time && evt.event_year) {
          eventYear = evt.event_year;
        } else if (evt.one_time) {
          // Infer next occurrence: if the date has already passed this year, use next year
          const hasPassed = evt.month < currentMonth || (evt.month === currentMonth && evt.day < currentDay);
          eventYear = hasPassed ? currentYear + 1 : currentYear;
        } else {
          eventYear = currentYear;
        }
        const monthStr = String(evt.month).padStart(2, "0");
        const dayStr = String(evt.day).padStart(2, "0");
        const startDate = `${eventYear}${monthStr}${dayStr}`;

        // Unique identifier
        const uid = `event-${evt.id}@daysight.xyz`;

        const veventLines = [
          "BEGIN:VEVENT",
          `DTSTART;VALUE=DATE:${startDate}`,
          foldLine(`SUMMARY:${escapeICSText(summary)}`),
        ];

        // Only add yearly recurrence for non-one-time events
        if (!evt.one_time) {
          veventLines.push("RRULE:FREQ=YEARLY");
        }

        veventLines.push(
          `UID:${uid}`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
          "END:VEVENT"
        );

        icsLines.push(...veventLines);
      }
    }

    icsLines.push("END:VCALENDAR");

    const icsContent = icsLines.join("\r\n");

    // Return as calendar file with proper headers for browser handling
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar;charset=utf-8",
        "Content-Disposition": `attachment;filename="daysight-calendar.ics"`,
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error: any) {
    console.error("Calendar feed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
