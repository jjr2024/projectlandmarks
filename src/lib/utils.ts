import { timingSafeEqual } from "crypto";

/**
 * Timing-safe comparison of bearer tokens.
 * Prevents timing attacks by comparing tokens in constant time.
 * Returns false if tokens are different lengths or don't match.
 */
export function compareTokens(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  if (provided.length !== expected.length) return false;

  try {
    return timingSafeEqual(
      Buffer.from(provided, "utf-8"),
      Buffer.from(expected, "utf-8")
    );
  } catch {
    return false;
  }
}

/** Format month + day as "April 24" */
export function formatDate(month: number, day: number): string {
  const d = new Date(2024, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export function monthName(month: number): string {
  return new Date(2024, month - 1, 1).toLocaleDateString("en-US", { month: "long" });
}

export function relationshipLabel(rel: string): string {
  const map: Record<string, string> = {
    family: "Family",
    friend: "Friend",
    colleague: "Colleague",
    other: "Other",
  };
  return map[rel] || rel;
}

const GIFT_LABELS: Record<string, string> = {
  flowers: "Flowers",
  wine: "Wine",
  treats: "Treats",
  gift_card: "Gift Card",
  experiences: "Experience",
  donation: "Donation",
  home: "Home",
  accessories: "Accessories",
};

export function giftLabelSingle(cat: string): string {
  return GIFT_LABELS[cat] || cat;
}

export function giftLabel(categories: string[], other?: string): string {
  const labels = categories.map((c) => giftLabelSingle(c));
  if (other) labels.push(other);
  return labels.length === 0 ? "Not set" : labels.join(", ");
}

export function eventTypeLabel(type: string): string {
  const map: Record<string, string> = {
    birthday: "Birthday",
    anniversary: "Anniversary",
    custom: "Custom Event",
  };
  return map[type] || type;
}

export function budgetLabel(tier: string | null): string | null {
  if (!tier) return null;
  const map: Record<string, string> = {
    low: "Under $30",
    mid: "$30–75",
    high: "$75+",
  };
  return map[tier] || null;
}

export function daysUntilLabel(days: number): string {
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function urgencyClass(days: number): "urgent" | "soon" | "upcoming" {
  if (days <= 3) return "urgent";
  if (days <= 7) return "soon";
  return "upcoming";
}

/** Get initials from a name for avatar display */
export function getInitials(firstName: string, lastName?: string): string {
  const f = firstName.charAt(0).toUpperCase();
  const l = lastName ? lastName.charAt(0).toUpperCase() : "";
  return f + l;
}

/**
 * Calculate days until the next occurrence of a month/day event.
 * For one-time events, returns days until the specific year or null if passed.
 */
export function daysUntilEvent(
  month: number,
  day: number,
  oneTime: boolean,
  eventYear?: number | null
): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();

  if (oneTime) {
    const yr = eventYear || thisYear;
    const next = new Date(yr, month - 1, day);
    next.setHours(0, 0, 0, 0);
    if (next < today) return null;
    return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  let next = new Date(thisYear, month - 1, day);
  next.setHours(0, 0, 0, 0);
  if (next < today) next = new Date(thisYear + 1, month - 1, day);

  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
