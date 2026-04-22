import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { EMAIL_CONFIG } from "@/lib/email-config";
import ReminderEmail from "@/emails/reminder";

/**
 * GET /api/test-email?to=you@example.com
 *
 * Dev-only route to verify Resend is working. Sends a sample reminder email.
 * Remove or protect this route before production launch.
 */
export async function GET(request: NextRequest) {
  // Only allow in development or with cron secret
  const authHeader = request.headers.get("authorization");
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = request.nextUrl.searchParams.get("to");
  if (!to) {
    return NextResponse.json({ error: "Missing ?to= parameter" }, { status: 400 });
  }

  try {
    const { data, error } = await resend().emails.send({
      from: EMAIL_CONFIG.from,
      to,
      replyTo: EMAIL_CONFIG.replyTo,
      subject: "Sarah's birthday is in 7 days — here's what to get",
      react: ReminderEmail({
        firstName: "James",
        contactFirstName: "Sarah",
        eventType: "birthday",
        daysBefore: 7,
        eventDateFormatted: "May 15",
        gifts: [
          {
            name: "Tulip Bouquet – Bouqs",
            partner: "Bouqs",
            description: "Farm-fresh, sustainably grown",
            price: "From $49",
            affiliate_url: "https://bouqs.com",
          },
          {
            name: "Artisan Chocolate Box – Vosges",
            partner: "Vosges",
            description: "Award-winning truffles, 36 pieces",
            price: "From $42",
            affiliate_url: "https://vosgeschocolate.com",
          },
          {
            name: "Airbnb Experience",
            partner: "Airbnb",
            description: "Unique local activity with a local guide",
            price: "From $30",
            affiliate_url: "https://airbnb.com/experiences",
          },
        ],
        suppressGifts: false,
        lastYearLine: "Last year we suggested flowers, cookies, and a necklace.",
        contactId: "test",
        userId: "test",
      }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
