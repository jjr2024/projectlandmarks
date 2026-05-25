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

import {
  REMINDER_WINDOWS,
  REMINDER_DAY_OPTIONS,
  REMINDER_TOLERANCE,
  DEFAULT_REMINDER_DAYS,
  SEND_HOUR_OPTIONS,
  DEFAULT_SEND_HOUR,
  DEFAULT_TIMEZONE,
  type ReminderDay,
  type SendHour,
} from "@/lib/email-config";

// Re-export so cron routes and UI can import from one module
export {
  REMINDER_WINDOWS,
  REMINDER_DAY_OPTIONS,
  DEFAULT_REMINDER_DAYS,
  SEND_HOUR_OPTIONS,
  DEFAULT_SEND_HOUR,
  DEFAULT_TIMEZONE,
  type ReminderDay,
  type SendHour,
};

// ── Date helpers ────────────────────────────────────────────────────────────

/** Check if a year is a leap year. */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Adjust Feb 29 to Feb 28 in non-leap years. */
function adjustLeapDay(month: number, day: number, year: number): number {
  if (month === 2 && day === 29 && !isLeapYear(year)) return 28;
  return day;
}

/** Next occurrence of month/day on or after `from`. Shared by reminders + digest. */
export function nextOccurrence(month: number, day: number, from: Date): Date {
  const thisYear = from.getFullYear();
  let adjustedDay = adjustLeapDay(month, day, thisYear);
  let d = new Date(thisYear, month - 1, adjustedDay);
  if (d < from) {
    const nextYear = thisYear + 1;
    adjustedDay = adjustLeapDay(month, day, nextYear);
    d = new Date(nextYear, month - 1, adjustedDay);
  }
  return d;
}

/** "May 15" — human-readable month + day. */
export function formatEventDate(month: number, day: number): string {
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

/**
 * @deprecated Use calendarDaysUntil() for timezone-aware day math.
 * Days between two dates (ceil). Timezone-naive — result depends on
 * the relationship between UTC timestamps, not calendar days.
 */
export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Timezone-aware calendar day math ────────────────────────────────────────
//
// Computes daysUntil as pure calendar days in the user's local timezone.
// May 25 → May 27 = 2, regardless of what hour it is.
// Uses Intl.DateTimeFormat for timezone conversion (V8 has full IANA tz data).

/** Extract { year, month (1-indexed), day } from a Date in the given IANA timezone. */
export function localDateParts(date: Date, timezone: string): { year: number; month: number; day: number } {
  const tz = timezone || DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);

  return {
    year: parseInt(parts.find((p) => p.type === "year")!.value, 10),
    month: parseInt(parts.find((p) => p.type === "month")!.value, 10),
    day: parseInt(parts.find((p) => p.type === "day")!.value, 10),
  };
}

/**
 * Calendar days from `now` to the next occurrence of month/day, computed
 * entirely in the user's local timezone. Returns { daysUntil, eventYear }.
 *
 * eventYear is the year of the next occurrence — use it for dedup keys,
 * shown_gifts logging, and email_overrides lookups (year-rollover safe).
 */
export function calendarDaysUntil(
  now: Date,
  eventMonth: number,
  eventDay: number,
  timezone: string
): { daysUntil: number; eventYear: number } {
  const tz = timezone || DEFAULT_TIMEZONE;
  const local = localDateParts(now, tz);

  // Build "today" as UTC midnight for clean day-only subtraction
  const todayUTC = Date.UTC(local.year, local.month - 1, local.day);

  // Next occurrence: try this year first, fall back to next year
  const adjDayThisYear = adjustLeapDay(eventMonth, eventDay, local.year);
  let eventUTC = Date.UTC(local.year, eventMonth - 1, adjDayThisYear);
  let eventYear = local.year;

  if (eventUTC < todayUTC) {
    const nextYear = local.year + 1;
    const adjDayNextYear = adjustLeapDay(eventMonth, eventDay, nextYear);
    eventUTC = Date.UTC(nextYear, eventMonth - 1, adjDayNextYear);
    eventYear = nextYear;
  }

  const daysUntil = Math.round((eventUTC - todayUTC) / (1000 * 60 * 60 * 24));
  return { daysUntil, eventYear };
}

/**
 * Get the current hour (0–23) in the user's local timezone.
 * Used by the cron route to gate processing on preferred_send_hour.
 */
export function localHour(date: Date, timezone: string): number {
  const tz = timezone || DEFAULT_TIMEZONE;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  }).formatToParts(date);

  return parseInt(parts.find((p) => p.type === "hour")!.value, 10);
}

/** YYYY-MM-DD string for dedup key. Zero-pads month and day. */
export function buildEventDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// ── Range-based window matching ─────────────────────────────────────────────
//
// Matches daysUntil against the user's selected reminder days using late-side-only
// tolerance windows (see REMINDER_TOLERANCE in email-config.ts). Each window
// extends backward only — e.g. canonical 7 covers [5, 7], never fires early.
//
// If the event is high_importance, day 21 is injected into the effective days
// list even if the user hasn't selected it — so important events always get
// an early heads-up.
//
// Falls back to DEFAULT_REMINDER_DAYS if userDays is null/empty.

interface WindowMatch {
  canonicalDaysBefore: number;
  isLastMinute: boolean;
}

export function matchReminderWindow(
  daysUntil: number,
  highImportance: boolean,
  userDays?: number[] | null
): WindowMatch | null {
  // Resolve effective days: user preference → fallback to defaults
  let effectiveDays: number[] =
    userDays && userDays.length > 0
      ? [...userDays]
      : [...DEFAULT_REMINDER_DAYS];

  // High-importance events always get a 21-day reminder
  if (highImportance && !effectiveDays.includes(21)) {
    effectiveDays.push(21);
  }

  // Check each of the user's selected days against tolerance windows.
  // Process from smallest to largest so the narrowest match wins when
  // tolerance ranges could theoretically overlap (they don't with current
  // config, but this is defensive).
  const sorted = effectiveDays
    .filter((d): d is ReminderDay => REMINDER_DAY_OPTIONS.includes(d as ReminderDay))
    .sort((a, b) => a - b);

  for (const day of sorted) {
    const [lo, hi] = REMINDER_TOLERANCE[day as ReminderDay];
    if (daysUntil >= lo && daysUntil <= hi) {
      return {
        canonicalDaysBefore: day,
        isLastMinute: daysUntil <= REMINDER_WINDOWS.LAST_MINUTE,
      };
    }
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
