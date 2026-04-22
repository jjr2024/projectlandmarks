/**
 * Shared constants and configurations for the Daysight application.
 */

export const GIFT_CATEGORIES = [
  "flowers",
  "wine",
  "treats",
  "gift_card",
  "experiences",
  "donation",
  "home",
  "accessories",
] as const;

export type GiftCategory = (typeof GIFT_CATEGORIES)[number];
