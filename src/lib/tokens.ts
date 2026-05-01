/**
 * HMAC-signed token generation and verification for Daysight.
 *
 * Used for unsubscribe links and calendar feed URLs so that:
 * 1. Tokens are not raw UUIDs (prevents enumeration)
 * 2. Only the server can generate valid tokens (HMAC-signed)
 * 3. Keys derived from CRON_SECRET; URLs use APP_URL for portability
 *
 * Token format: base64url(HMAC-SHA256(purpose:userId))
 * URL format:   ?uid={userId}&token={hmac}
 */

import { createHmac } from "crypto";

/**
 * Derive a purpose-specific HMAC key from CRON_SECRET.
 * Each purpose (unsubscribe, calendar) gets a distinct key
 * so compromising one doesn't compromise the other.
 */
function deriveKey(purpose: string): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET is not configured");
  return createHmac("sha256", secret).update(`daysight:${purpose}`).digest("hex");
}

/**
 * Generate an HMAC token for the given userId and purpose.
 */
export function generateToken(userId: string, purpose: "unsubscribe" | "calendar"): string {
  const key = deriveKey(purpose);
  return createHmac("sha256", key)
    .update(userId)
    .digest("base64url");
}

/**
 * Verify an HMAC token. Returns true if valid.
 * Uses timing-safe comparison via double-HMAC to prevent timing attacks.
 */
export function verifyToken(
  userId: string,
  token: string,
  purpose: "unsubscribe" | "calendar"
): boolean {
  if (!userId || !token) return false;

  try {
    const expected = generateToken(userId, purpose);
    // Constant-time comparison: compare HMACs of both values
    // (avoids the length-check timing issue in timingSafeEqual)
    const key = deriveKey(purpose);
    const a = createHmac("sha256", key).update(expected).digest();
    const b = createHmac("sha256", key).update(token).digest();
    return a.length === b.length && Buffer.compare(a, b) === 0;
  } catch {
    return false;
  }
}

/**
 * Build a full signed URL for a given purpose.
 * Uses APP_URL env var so it works across dev/staging/production.
 */
export function buildSignedUrl(
  userId: string,
  purpose: "unsubscribe" | "calendar"
): string {
  const baseUrl = process.env.APP_URL;
  if (!baseUrl) throw new Error("APP_URL environment variable is not configured");
  // Strip trailing slash for clean URL construction
  const origin = baseUrl.replace(/\/+$/, "");

  const token = generateToken(userId, purpose);
  if (purpose === "unsubscribe") {
    return `${origin}/unsubscribe?uid=${userId}&token=${token}`;
  }
  if (purpose === "calendar") {
    return `${origin}/api/calendar/${userId}?token=${token}`;
  }
  throw new Error(`Unknown purpose: ${purpose}`);
}
