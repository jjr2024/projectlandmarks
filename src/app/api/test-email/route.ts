// This route has been intentionally removed for production.
// It was a dev-only endpoint for testing Resend email delivery.
// If you need to test emails, use the Resend dashboard or a local script.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "This endpoint has been disabled." },
    { status: 410 }
  );
}
