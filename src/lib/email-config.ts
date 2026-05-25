/**
 * Daysight — Email sending configuration.
 * Ported from the prototype's js/email-config.js with domain updated to daysight.xyz.
 */

import { buildSignedUrl } from "@/lib/tokens";

export const EMAIL_CONFIG = {
  from: "Daysight <noreply@daysight.xyz>",
  replyTo: "support@daysight.xyz",

  /** Compliance headers applied to every outgoing email. */
  headers: (opts: { userId: string; reminderType?: string; partner?: string; reminderId?: string }) => {
    const unsubUrl = buildSignedUrl(opts.userId, "unsubscribe");
    return {
      "List-Unsubscribe": `<${unsubUrl}>, <mailto:unsubscribe@daysight.xyz?subject=Unsubscribe-${opts.userId}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      "Feedback-ID": `${opts.reminderType || "reminder"}:${opts.partner || "daysight"}:daysight`,
      "X-Entity-Ref-ID": opts.reminderId || "",
    };
  },
} as const;

/**
 * User-selectable reminder days, ordered descending.
 * Used by the settings UI and cron matching logic.
 */
export const REMINDER_DAY_OPTIONS = [1, 3, 7, 14, 21] as const;
export type ReminderDay = (typeof REMINDER_DAY_OPTIONS)[number];

/** Default reminder days for new users or profiles with null/empty preference. */
export const DEFAULT_REMINDER_DAYS: ReminderDay[] = [7, 3];

/**
 * Late-side-only tolerance windows per reminder day.
 * Each window extends backward (fewer days remaining) to self-heal
 * after cron outages of up to 2 days. Never fires early.
 *
 * Example: canonical 7 with range [5, 7] means if cron misses day 7,
 * it still catches the reminder at day 6 or 5.
 */
export const REMINDER_TOLERANCE: Record<ReminderDay, [number, number]> = {
  21: [19, 21],
  14: [12, 14],
  7: [5, 7],
  3: [2, 3],
  1: [0, 1],
};

/**
 * @deprecated Use REMINDER_DAY_OPTIONS and REMINDER_TOLERANCE instead.
 * Kept temporarily for any code that still references these constants.
 */
export const REMINDER_WINDOWS = {
  HIGH_IMPORTANCE: 21,
  STANDARD: 7,
  URGENT: 3,
  LAST_MINUTE: 2,
} as const;
