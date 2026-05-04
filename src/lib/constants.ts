/**
 * Shared constants and configurations for the Daysight application.
 */

export const GIFT_CATEGORIES = [
  "flowers",
  "wine",
  "treats",
  "gift_card",
  "experiences",
  "home",
  "accessories",
] as const;

export type GiftCategory = (typeof GIFT_CATEGORIES)[number];

/** Days soft-deleted contacts/events are kept before hard-delete by purge cron. */
export const TRASH_HOLD_DAYS = 7;
