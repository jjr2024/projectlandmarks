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

// In-memory rate limit: max 5 submissions per IP per 15 minutes.
// Resets on redeploy (acceptable for a contact form; use Redis for stricter needs).
//
// NOTE: In serverless deployments, each function instance maintains its own map.
// Traffic to different instances bypasses this limiter. For production, use Redis
// or a persistent rate-limiting service (e.g., Upstash) to coordinate across instances.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/** Strip control characters and newlines to prevent header injection. */
function sanitize(input: string): string {
  return input.replace(/[\r\n\x00-\x1f\x7f]/g, " ").trim();
}

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

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

  // Sanitize inputs: strip control characters / newlines to prevent header injection
  const senderName = sanitize(body.name?.trim() || "Anonymous");
  const senderEmail = body.email.trim();
  const message = body.message.trim();

  // Cap message length to prevent abuse
  if (message.length > 5000) {
    return NextResponse.json({ error: "Message is too long (5000 character limit)" }, { status: 400 });
  }

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
