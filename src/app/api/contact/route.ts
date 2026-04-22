import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";

/**
 * POST /api/contact
 *
 * Receives contact form submissions and forwards them via Resend
 * to the support email address.
 *
 * Expected payload:
 * {
 *   name?: string,
 *   email: string,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email?.trim() || !body.message?.trim()) {
    return NextResponse.json({ error: "Email and message are required" }, { status: 400 });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  // Rate-limit: basic protection (in production, add IP-based limiting)
  const senderName = body.name?.trim() || "Anonymous";
  const senderEmail = body.email.trim();
  const message = body.message.trim();

  try {
    await resend().emails.send({
      from: "Daysight Contact Form <noreply@daysight.xyz>",
      to: "hello@daysight.xyz",
      replyTo: senderEmail,
      subject: `Contact form: ${senderName}`,
      text: [
        `From: ${senderName} <${senderEmail}>`,
        "",
        message,
        "",
        "---",
        "Sent via daysight.xyz/contact",
      ].join("\n"),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Contact form email failed:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
