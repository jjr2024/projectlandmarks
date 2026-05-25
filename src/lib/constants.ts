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

/** Gift category options with display labels and descriptions for UI components. */
export const GIFT_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "flowers", label: "Flowers", description: "Bouquets & arrangements" },
  { value: "wine", label: "Wine", description: "Bottles & subscriptions" },
  { value: "food_snacks", label: "Food & Snacks", description: "Chocolates, treats & gourmet" },
  { value: "home", label: "Home", description: "Decor, kitchen & lifestyle" },
  { value: "books", label: "Books", description: "Fiction & non-fiction" },
  { value: "electronics", label: "Electronics", description: "Tech & gadgets" },
  { value: "sports", label: "Sports", description: "Gear & active lifestyle" },
  { value: "apparel", label: "Apparel", description: "Clothing & shoes" },
  { value: "beauty", label: "Beauty", description: "Skincare & self-care" },
  { value: "jewelry", label: "Jewelry", description: "Rings, necklaces & watches" },
  { value: "wellness", label: "Wellness", description: "Health & fitness" },
  { value: "games_toys", label: "Games & Toys", description: "Fun for all ages" },
];

/** Days soft-deleted contacts/events are kept before hard-delete by purge cron. */
export const TRASH_HOLD_DAYS = 7;
