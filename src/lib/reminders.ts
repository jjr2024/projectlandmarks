/**
 * Daysight — Shared reminder logic.
 *
 * Pure functions extracted from cron routes so they can be tested independently
 * and shared across reminders/digest without duplication.
 *
 * EMAIL RESILIENCE MODEL (see CLAUDE.md § Email Resilience):
 *   1. Pre-send logging:  write status='pending' BEFORE calling Resend
 *   2. Idempotency key:   deterministic key per reminder prevents Resend dupes
 *   3. Range-based windows: missed days are caught on the next cron run
 *   4. Per-user send cap:  max N emails/user/24h to prevent flood after outage
 *   5. 429 handling:       stop processing on rate limit, defer remaining
 */

import { REMINDER_WINDOWS } from "@/lib/email-config";

// Re-export so cron routes can import everything from one module
export { REMINDER_WINDOWS };

// ── Date helpers ────────────────────────────────────────────────────────────

/** Check if a year is a leap year. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Next occurrence of month/day on or after `from`. Shared by reminders + digest. */
export function nextOccurrence(month: number, day: number, from: Date): Date {
  const thisYear = from.getFullYear();
  // Handle Feb 29: if not a leap year, use Feb 28 instead
  let adjustedDay = day;
  if (month === 2 && day === 29 && !isLeapYear(thisYear)) {
    adjustedDay = 28;
  }
  let d = new Date(thisYear, month - 1, adjustedDay);
  if (d < from) {
    const nextYear = thisYear + 1;
    adjustedDay = day;
    if (month === 2 && day === 29 && !isLeapYear(nextYear)) {
      adjustedDay = 28;
    }
    d = new Date(nextYear, month - 1, adjustedDay);
  }
  return d;
}

/** "May 15" — human-readable month + day. */
export function formatEventDate(month: number, day: number): string {
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/** Days between two dates (ceil). `from` should be start-of-day or current time. */
export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** YYYY-MM-DD string for dedup key. Zero-pads month and day. */
export function buildEventDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Range-based window matching ─────────────────────────────────────────────
//
// Old logic: exact match (daysUntil === 7). If cron missed that day, reminder lost.
// New logic: daysUntil falls within a range AND no log entry exists for that window.
// The dedup check still happens in the route (DB query), but this function determines
// which window a given daysUntil value maps to — returning the canonical days_before
// value to log, or null if no window applies.
//
// Ranges (inclusive):
//   HIGH_IMPORTANCE: 19–21 days → logs as 21
//   STANDARD:         5–7  days → logs as 7
//   URGENT:           1–3  days → logs as 3
//
// This means if cron misses the exact day, the next run (up to 2 days late) still
// catches it. The logged days_before is always the canonical value (21/7/3) so
// dedup works correctly across the range.

interface WindowMatch {
  canonicalDaysBefore: number;
  isLastMinute: boolean;
}

export function matchReminderWindow(
  daysUntil: number,
  highImportance: boolean
): WindowMatch | null {
  // Order matters: check narrowest windows first so a day=3 event matches URGENT, not STANDARD
  if (daysUntil >= 1 && daysUntil <= REMINDER_WINDOWS.URGENT) {
    return { canonicalDaysBefore: REMINDER_WINDOWS.URGENT, isLastMinute: daysUntil <= REMINDER_WINDOWS.LAST_MINUTE };
  }
  if (daysUntil >= 5 && daysUntil <= REMINDER_WINDOWS.STANDARD) {
    return { canonicalDaysBefore: REMINDER_WINDOWS.STANDARD, isLastMinute: false };
  }
  if (highImportance && daysUntil >= 19 && daysUntil <= REMINDER_WINDOWS.HIGH_IMPORTANCE) {
    return { canonicalDaysBefore: REMINDER_WINDOWS.HIGH_IMPORTANCE, isLastMinute: false };
  }
  return null;
}

// ── Idempotency ─────────────────────────────────────────────────────────────

/**
 * Deterministic idempotency key for Resend. If our code accidentally calls
 * Resend twice for the same reminder (e.g., retry after timeout), Resend
 * deduplicates on this key and only sends one email.
 *
 * Format: ds-{userId}-{eventId}-{canonicalDaysBefore}-{eventDateStr}
 */
export function buildIdempotencyKey(
  userId: string,
  eventId: string,
  canonicalDaysBefore: number,
  eventDateStr: string
): string {
  return `ds-${userId}-${eventId}-${canonicalDaysBefore}-${eventDateStr}`;
}

// ── Per-user send cap ───────────────────────────────────────────────────────

/** Max reminder emails per user per 24h window. Prevents flood after outage. */
export const MAX_EMAILS_PER_USER_PER_DAY = 3;

// ── Last-year-line sentence builder (pure) ──────────────────────────────────

/** Builds the "Last year we suggested ..." sentence from an array of gift names. */
export function buildLastYearLine(giftNames: string[]): string | null {
  if (giftNames.length === 0) return null;
  if (giftNames.length === 1) return `Last year we suggested ${giftNames[0]}.`;
  if (giftNames.length === 2) return `Last year we suggested ${giftNames[0]} and ${giftNames[1]}.`;
  return `Last year we suggested ${giftNames.slice(0, -1).join(", ")}, and ${giftNames[giftNames.length - 1]}.`;
}

// ── Rate-limit detection ────────────────────────────────────────────────────

/** Returns true if an error from Resend is a 429 rate limit. */
export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  // Resend SDK wraps HTTP errors; check statusCode or message
  if (error.statusCode === 429) return true;
  if (typeof error.message === "string" && error.message.includes("429")) return true;
  return false;
}

// ── Cron results accumulator ────────────────────────────────────────────────

export interface CronResults {
  sent: number;
  skipped: number;
  deferred: number;
  errors: string[];
  rateLimited: boolean;
}

export function emptyCronResults(): CronResults {
  return { sent: 0, skipped: 0, deferred: 0, errors: [], rateLimited: false };
}
