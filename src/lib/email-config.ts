/**
 * Daysight — Email sending configuration.
 * Ported from the prototype's js/email-config.js with domain updated to daysight.xyz.
 */

export const EMAIL_CONFIG = {
  from: "Daysight <noreply@daysight.xyz>",
  replyTo: "support@daysight.xyz",

  /** Compliance headers applied to every outgoing email. */
  headers: (opts: { userId: string; reminderType?: string; partner?: string; reminderId?: string }) => ({
    "List-Unsubscribe": `<https://daysight.xyz/unsubscribe?token=${opts.userId}>, <mailto:unsubscribe@daysight.xyz?subject=Unsubscribe-${opts.userId}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "Feedback-ID": `${opts.reminderType || "reminder"}:${opts.partner || "daysight"}:daysight`,
    "X-Entity-Ref-ID": opts.reminderId || "",
  }),
} as const;

/**
 * Reminder timing thresholds.
 * high_importance events get an extra 21-day reminder.
 * Standard events get reminders at 7 and 3 days before.
 */
export const REMINDER_WINDOWS = {
  HIGH_IMPORTANCE: 21,
  STANDARD: 7,
  URGENT: 3,
  LAST_MINUTE: 2,
} as const;
