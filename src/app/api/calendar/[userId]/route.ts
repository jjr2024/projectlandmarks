import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/calendar/[userId].ics
 *
 * Generates and returns a calendar feed (.ics file) for the user's events.
 * All events are rendered as all-day recurring annual events (RRULE:FREQ=YEARLY).
 *
 * No authentication required — userId in URL acts as an opaque token (UUID format).
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

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const userId = params.userId;

  // Validate userId is a UUID-like string (basic sanity check)
  if (!userId || !/^[a-f0-9-]{36}$/.test(userId)) {
    return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
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
      .eq("user_id", userId);

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

        // Format date as YYYYMMDD (use 2024 as a placeholder year for format)
        // The RRULE:FREQ=YEARLY ensures it recurs every year regardless
        const monthStr = String(evt.month).padStart(2, "0");
        const dayStr = String(evt.day).padStart(2, "0");
        const startDate = `2024${monthStr}${dayStr}`;

        // Unique identifier
        const uid = `event-${evt.id}@daysight.xyz`;

        icsLines.push(
          "BEGIN:VEVENT",
          `DTSTART;VALUE=DATE:${startDate}`,
          `SUMMARY:${escapeICSText(summary)}`,
          "RRULE:FREQ=YEARLY",
          `UID:${uid}`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
          "END:VEVENT"
        );
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
