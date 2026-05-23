/**
 * Shared constants and configurations for the Daysight application.
 */

export const GIFT_CATEGORIES = [
  "flowers",
  "wine",
  "food_snacks",
  "home",
  "books",
  "electronics",
  "sports",
  "apparel",
  "beauty",
  "jewelry",
  "wellness",
  "games_toys",
] as const;

export type GiftCategory = (typeof GIFT_CATEGORIES)[number];

/** Days soft-deleted contacts/events are kept before hard-delete by purge cron. */
export const TRASH_HOLD_DAYS = 7;
