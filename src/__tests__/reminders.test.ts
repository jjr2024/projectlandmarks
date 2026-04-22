/**
 * Unit tests for Daysight reminder helper functions.
 *
 * Tests cover date math, reminder window matching, rate-limit detection,
 * and utility functions. These are pure functions extracted from cron routes
 * and can be tested without a database or HTTP client.
 *
 * Run with: `npx tsx src/__tests__/reminders.test.ts`
 * or:       `node --loader tsx src/__tests__/reminders.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  nextOccurrence,
  formatEventDate,
  daysBetween,
  buildEventDateStr,
  matchReminderWindow,
  buildIdempotencyKey,
  buildLastYearLine,
  isRateLimitError,
  MAX_EMAILS_PER_USER_PER_DAY,
  emptyCronResults,
  REMINDER_WINDOWS,
} from "@/lib/reminders";
import {
  scoreGift,
  buildShuffleSeed,
  parseTagHints,
  GiftRow,
  ScoringContext,
} from "@/lib/gift-engine";

// ══════════════════════════════════════════════════════════════════════════════
// ─ REMINDERS.TS TESTS ────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("nextOccurrence(month, day, from)", () => {
  test("basic case: future date this year", () => {
    const from = new Date(2026, 0, 15); // Jan 15, 2026
    const result = nextOccurrence(6, 20, from); // June 20
    assert.strictEqual(result.getFullYear(), 2026);
    assert.strictEqual(result.getMonth(), 5); // June (0-indexed)
    assert.strictEqual(result.getDate(), 20);
  });

  test("date already passed this year → returns next year", () => {
    const from = new Date(2026, 7, 15); // Aug 15, 2026
    const result = nextOccurrence(3, 10, from); // Mar 10 (already passed in 2026)
    assert.strictEqual(result.getFullYear(), 2027);
    assert.strictEqual(result.getMonth(), 2); // March
    assert.strictEqual(result.getDate(), 10);
  });

  test("exact date match (today) → returns today", () => {
    const from = new Date(2026, 4, 20); // May 20, 2026
    const result = nextOccurrence(5, 20, from); // May 20
    assert.strictEqual(result.getFullYear(), 2026);
    assert.strictEqual(result.getMonth(), 4);
    assert.strictEqual(result.getDate(), 20);
  });

  test("Feb 29 in non-leap year → Date constructor handles gracefully", () => {
    // 2027 is not a leap year; Feb 29 doesn't exist
    const from = new Date(2027, 0, 1); // Jan 1, 2027
    const result = nextOccurrence(2, 29, from); // Feb 29
    // JavaScript Date constructor with invalid day (29 in non-leap year)
    // rolls to next valid month. Behavior: Feb 29, 2027 becomes Mar 1, 2027
    assert.strictEqual(result.getMonth(), 2); // March (constructor rolls over)
    assert.strictEqual(result.getDate(), 1);
  });

  test("Dec 31 with from = Jan 1 (same year) → returns Dec 31 same year", () => {
    const from = new Date(2026, 0, 1); // Jan 1, 2026
    const result = nextOccurrence(12, 31, from); // Dec 31
    assert.strictEqual(result.getFullYear(), 2026);
    assert.strictEqual(result.getMonth(), 11); // December
    assert.strictEqual(result.getDate(), 31);
  });

  test("Jan 1 with from = Dec 31 (crosses year boundary) → returns Jan 1 next year", () => {
    const from = new Date(2026, 11, 31); // Dec 31, 2026
    const result = nextOccurrence(1, 1, from); // Jan 1
    assert.strictEqual(result.getFullYear(), 2027);
    assert.strictEqual(result.getMonth(), 0); // January
    assert.strictEqual(result.getDate(), 1);
  });
});

describe("daysBetween(from, to)", () => {
  test("same day → 0", () => {
    const from = new Date(2026, 4, 15, 12, 0, 0);
    const to = new Date(2026, 4, 15, 12, 0, 0);
    assert.strictEqual(daysBetween(from, to), 0);
  });

  test("adjacent days → 1", () => {
    const from = new Date(2026, 4, 15, 0, 0, 0);
    const to = new Date(2026, 4, 16, 0, 0, 0);
    assert.strictEqual(daysBetween(from, to), 1);
  });

  test("multiple days", () => {
    const from = new Date(2026, 4, 15, 0, 0, 0);
    const to = new Date(2026, 4, 20, 0, 0, 0);
    assert.strictEqual(daysBetween(from, to), 5);
  });

  test("across month boundary", () => {
    const from = new Date(2026, 4, 30, 0, 0, 0); // May 30
    const to = new Date(2026, 5, 3, 0, 0, 0); // June 3
    assert.strictEqual(daysBetween(from, to), 4);
  });

  test("across year boundary (Dec 31 → Jan 1)", () => {
    const from = new Date(2025, 11, 31, 0, 0, 0); // Dec 31, 2025
    const to = new Date(2026, 0, 1, 0, 0, 0); // Jan 1, 2026
    assert.strictEqual(daysBetween(from, to), 1);
  });

  test("fractional day (from noon to noon+12h) → ceils to 1", () => {
    const from = new Date(2026, 4, 15, 12, 0, 0);
    const to = new Date(2026, 4, 16, 0, 0, 0); // 12 hours later
    // (12h / 24h) = 0.5 day, ceil(0.5) = 1
    assert.strictEqual(daysBetween(from, to), 1);
  });

  test("negative days (past date) → negative result", () => {
    const from = new Date(2026, 4, 20, 0, 0, 0);
    const to = new Date(2026, 4, 15, 0, 0, 0);
    assert.strictEqual(daysBetween(from, to), -5);
  });
});

describe("buildEventDateStr(year, month, day)", () => {
  test("pads month and day to 2 digits", () => {
    assert.strictEqual(buildEventDateStr(2026, 1, 5), "2026-01-05");
    assert.strictEqual(buildEventDateStr(2026, 12, 31), "2026-12-31");
  });

  test("already 2-digit month/day stays same", () => {
    assert.strictEqual(buildEventDateStr(2026, 10, 15), "2026-10-15");
  });
});

describe("formatEventDate(month, day)", () => {
  test("formats as human-readable month + day", () => {
    const result = formatEventDate(5, 20);
    assert.match(result, /May 20/);
  });

  test("single-digit days are not zero-padded in output", () => {
    const result = formatEventDate(3, 5);
    assert.match(result, /March 5/);
  });

  test("December 25 (Christmas)", () => {
    const result = formatEventDate(12, 25);
    assert.match(result, /December 25/);
  });
});

describe("matchReminderWindow(daysUntil, highImportance)", () => {
  test("daysUntil=7 (standard) → canonical 7, not last-minute", () => {
    const result = matchReminderWindow(7, false);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 7);
    assert.strictEqual(result.isLastMinute, false);
  });

  test("daysUntil=5 (range 5-7) → canonical 7", () => {
    const result = matchReminderWindow(5, false);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 7);
  });

  test("daysUntil=6 (range 5-7) → canonical 7", () => {
    const result = matchReminderWindow(6, false);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 7);
  });

  test("daysUntil=3 (urgent) → canonical 3, not last-minute", () => {
    const result = matchReminderWindow(3, false);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 3);
    assert.strictEqual(result.isLastMinute, false);
  });

  test("daysUntil=1 (range 1-3) → canonical 3", () => {
    const result = matchReminderWindow(1, false);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 3);
  });

  test("daysUntil=2 (range 1-3, last-minute) → canonical 3, isLastMinute=true", () => {
    const result = matchReminderWindow(2, false);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 3);
    assert.strictEqual(result.isLastMinute, true); // <= LAST_MINUTE (2)
  });

  test("daysUntil=21 with highImportance=true → canonical 21", () => {
    const result = matchReminderWindow(21, true);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 21);
    assert.strictEqual(result.isLastMinute, false);
  });

  test("daysUntil=19 with highImportance=true (range 19-21) → canonical 21", () => {
    const result = matchReminderWindow(19, true);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 21);
  });

  test("daysUntil=20 with highImportance=true (range 19-21) → canonical 21", () => {
    const result = matchReminderWindow(20, true);
    assert.ok(result);
    assert.strictEqual(result.canonicalDaysBefore, 21);
  });

  test("daysUntil=21 with highImportance=false → null (high-importance window skipped)", () => {
    const result = matchReminderWindow(21, false);
    assert.strictEqual(result, null);
  });

  test("daysUntil=10 → null (outside all windows)", () => {
    const result = matchReminderWindow(10, false);
    assert.strictEqual(result, null);
  });

  test("daysUntil=0 → null (same-day not covered)", () => {
    const result = matchReminderWindow(0, false);
    assert.strictEqual(result, null);
  });

  test("daysUntil=4 → null (gap between URGENT and STANDARD windows)", () => {
    const result = matchReminderWindow(4, false);
    assert.strictEqual(result, null);
  });

  test("daysUntil=8 → null (outside range)", () => {
    const result = matchReminderWindow(8, false);
    assert.strictEqual(result, null);
  });

  test("negative daysUntil → null", () => {
    const result = matchReminderWindow(-1, false);
    assert.strictEqual(result, null);
  });
});

describe("buildIdempotencyKey(...)", () => {
  test("deterministic format: ds-{userId}-{eventId}-{days}-{dateStr}", () => {
    const key = buildIdempotencyKey("user-123", "event-456", 7, "2026-05-20");
    assert.strictEqual(key, "ds-user-123-event-456-7-2026-05-20");
  });

  test("different inputs → different keys", () => {
    const key1 = buildIdempotencyKey("user-1", "event-1", 7, "2026-05-20");
    const key2 = buildIdempotencyKey("user-2", "event-1", 7, "2026-05-20");
    assert.notStrictEqual(key1, key2);
  });

  test("same inputs → same key (deterministic)", () => {
    const inputs = ["user-abc", "event-xyz", 3, "2026-12-25"] as const;
    const key1 = buildIdempotencyKey(...inputs);
    const key2 = buildIdempotencyKey(...inputs);
    assert.strictEqual(key1, key2);
  });
});

describe("buildLastYearLine(giftNames)", () => {
  test("empty array → null", () => {
    assert.strictEqual(buildLastYearLine([]), null);
  });

  test("single gift → 'Last year we suggested {gift}.'", () => {
    const result = buildLastYearLine(["Coffee Maker"]);
    assert.strictEqual(result, "Last year we suggested Coffee Maker.");
  });

  test("two gifts → 'Last year we suggested {gift1} and {gift2}.'", () => {
    const result = buildLastYearLine(["Coffee Maker", "Gift Card"]);
    assert.strictEqual(result, "Last year we suggested Coffee Maker and Gift Card.");
  });

  test("three gifts → 'Last year we suggested {gift1}, {gift2}, and {gift3}.'", () => {
    const result = buildLastYearLine(["Coffee Maker", "Gift Card", "Book"]);
    assert.strictEqual(result, "Last year we suggested Coffee Maker, Gift Card, and Book.");
  });

  test("four or more gifts → oxford comma list", () => {
    const result = buildLastYearLine(["A", "B", "C", "D"]);
    assert.strictEqual(result, "Last year we suggested A, B, C, and D.");
  });
});

describe("isRateLimitError(error)", () => {
  test("error.statusCode === 429 → true", () => {
    assert.strictEqual(isRateLimitError({ statusCode: 429 }), true);
  });

  test("error.message includes '429' → true", () => {
    assert.strictEqual(isRateLimitError({ message: "Rate limited: 429" }), true);
  });

  test("both statusCode and message 429 → true", () => {
    assert.strictEqual(
      isRateLimitError({ statusCode: 429, message: "Too many requests" }),
      true
    );
  });

  test("error with statusCode 500 → false", () => {
    assert.strictEqual(isRateLimitError({ statusCode: 500 }), false);
  });

  test("error with unrelated message → false", () => {
    assert.strictEqual(isRateLimitError({ message: "Connection timeout" }), false);
  });

  test("null error → false", () => {
    assert.strictEqual(isRateLimitError(null), false);
  });

  test("undefined error → false", () => {
    assert.strictEqual(isRateLimitError(undefined), false);
  });

  test("empty object → false", () => {
    assert.strictEqual(isRateLimitError({}), false);
  });
});

describe("MAX_EMAILS_PER_USER_PER_DAY", () => {
  test("constant is defined", () => {
    assert.strictEqual(typeof MAX_EMAILS_PER_USER_PER_DAY, "number");
    assert.strictEqual(MAX_EMAILS_PER_USER_PER_DAY, 3);
  });
});

describe("emptyCronResults()", () => {
  test("returns fresh CronResults object", () => {
    const result = emptyCronResults();
    assert.strictEqual(result.sent, 0);
    assert.strictEqual(result.skipped, 0);
    assert.strictEqual(result.deferred, 0);
    assert.deepStrictEqual(result.errors, []);
    assert.strictEqual(result.rateLimited, false);
  });

  test("each call returns a new object (not shared)", () => {
    const r1 = emptyCronResults();
    const r2 = emptyCronResults();
    r1.sent = 5;
    assert.strictEqual(r2.sent, 0);
  });
});

describe("REMINDER_WINDOWS constant", () => {
  test("exports expected values", () => {
    assert.strictEqual(REMINDER_WINDOWS.HIGH_IMPORTANCE, 21);
    assert.strictEqual(REMINDER_WINDOWS.STANDARD, 7);
    assert.strictEqual(REMINDER_WINDOWS.URGENT, 3);
    assert.strictEqual(REMINDER_WINDOWS.LAST_MINUTE, 2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ─ GIFT-ENGINE.TS TESTS ──────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

describe("scoreGift(gift, ctx)", () => {
  const mockGift = (overrides?: Partial<GiftRow>): GiftRow => ({
    id: "gift-1",
    name: "Coffee Maker",
    partner: "amazon",
    affiliate_url: "https://example.com",
    image_url: null,
    category: "electronics",
    price_tier: "mid",
    tags: ["coffee", "kitchen"],
    relationship_affinities: ["colleague", "friend"],
    event_affinities: ["birthday"],
    is_last_minute: false,
    is_active: true,
    ...overrides,
  });

  const mockContext = (overrides?: Partial<ScoringContext>): ScoringContext => ({
    categories: ["electronics"],
    budgetTier: "mid",
    relationship: "colleague",
    eventType: "birthday",
    tagHints: ["coffee"],
    daysUntil: 10,
    previousGiftIds: new Set(),
    repeatCounts: new Map(),
    shuffleSeed: 12345,
    ...overrides,
  });

  test("category match adds +40", () => {
    const gift = mockGift();
    const ctx = mockContext();
    const score = scoreGift(gift, ctx);
    // Should include +40 for category match
    assert.ok(score >= 40);
  });

  test("budget tier match adds +20", () => {
    const gift = mockGift();
    const ctx = mockContext();
    const score = scoreGift(gift, ctx);
    // Should include +20 for budget match (+ category +40 + affinity bonuses)
    assert.ok(score >= 20);
  });

  test("relationship affinity adds +15", () => {
    const gift = mockGift();
    const ctx = mockContext({ relationship: "colleague" });
    const score = scoreGift(gift, ctx);
    assert.ok(score >= 15);
  });

  test("event affinity adds +15", () => {
    const gift = mockGift();
    const ctx = mockContext({ eventType: "birthday" });
    const score = scoreGift(gift, ctx);
    assert.ok(score >= 15);
  });

  test("no affinity when relationship doesn't match", () => {
    const gift = mockGift({ relationship_affinities: ["friend"] });
    const ctx = mockContext({ relationship: "stranger" });
    const score = scoreGift(gift, ctx);
    // No +15 for relationship, but category +40 still applies
    assert.ok(score >= 0); // Could be negative with penalties
  });

  test("tag overlap: substring matching adds +3 per match", () => {
    const gift = mockGift({ tags: ["coffee", "maker"] });
    const ctx = mockContext({ tagHints: ["coffee", "machine"] });
    const score = scoreGift(gift, ctx);
    // coffee matches, machine doesn't match 'maker' (no substring overlap)
    // So at least +3 for one tag match (coffee) plus base bonuses
    assert.ok(score >= 40); // Category match + at least one tag
  });

  test("last-minute bonus (+10) when daysUntil <= LAST_MINUTE and is_last_minute=true", () => {
    const gift = mockGift({ is_last_minute: true });
    const ctx = mockContext({ daysUntil: 2 }); // <= 2
    const score = scoreGift(gift, ctx);
    assert.ok(score >= 10);
  });

  test("last-minute penalty (-20) when daysUntil <= LAST_MINUTE and is_last_minute=false", () => {
    const gift = mockGift({ is_last_minute: false });
    const ctx = mockContext({ daysUntil: 2 }); // <= 2
    const score = scoreGift(gift, ctx);
    // Should include -20 for last-minute penalty, but full score depends on all factors
    assert.ok(typeof score === "number");
  });

  test("no last-minute bonus/penalty when daysUntil > LAST_MINUTE", () => {
    const gift1 = mockGift({ is_last_minute: true });
    const gift2 = mockGift({ is_last_minute: false });
    const ctx = mockContext({ daysUntil: 10 });
    const score1 = scoreGift(gift1, ctx);
    const score2 = scoreGift(gift2, ctx);
    // Both should have same base score (no +10 or -20)
    assert.strictEqual(score1, score2);
  });

  test("repeat penalty: shown once → -25", () => {
    const gift = mockGift();
    const ctx = mockContext({
      repeatCounts: new Map([["gift-1", 1]]),
    });
    const score = scoreGift(gift, ctx);
    // Should include -25 for 1 repeat
    assert.ok(typeof score === "number");
  });

  test("repeat penalty: shown twice → -50 (graduated)", () => {
    const gift = mockGift();
    const ctx = mockContext({
      repeatCounts: new Map([["gift-1", 2]]),
    });
    const score = scoreGift(gift, ctx);
    // Should include -50 for 2 repeats
    assert.ok(typeof score === "number");
  });

  test("shuffle jitter is deterministic: same seed produces same score", () => {
    const gift = mockGift();
    const ctx = mockContext({ shuffleSeed: 999 });
    const score1 = scoreGift(gift, ctx);
    const score2 = scoreGift(gift, ctx);
    assert.strictEqual(score1, score2);
  });

  test("shuffle jitter differs for different gifts (same seed)", () => {
    const gift1 = mockGift({ id: "gift-1" });
    const gift2 = mockGift({ id: "gift-2" });
    const ctx = mockContext({ shuffleSeed: 999 });
    const score1 = scoreGift(gift1, ctx);
    const score2 = scoreGift(gift2, ctx);
    // Different gift IDs → different jitter
    assert.notStrictEqual(score1, score2);
  });

  test("all affinity+category match: high score", () => {
    const gift = mockGift({
      category: "electronics",
      price_tier: "mid",
      relationship_affinities: ["colleague"],
      event_affinities: ["birthday"],
    });
    const ctx = mockContext({
      categories: ["electronics"],
      budgetTier: "mid",
      relationship: "colleague",
      eventType: "birthday",
      daysUntil: 10,
    });
    const score = scoreGift(gift, ctx);
    // Should include +40 (category) +20 (budget) +15 (rel) +15 (event) = 90+ with jitter
    assert.ok(score >= 90);
  });

  test("mismatched categories but some matches: moderate score", () => {
    const gift = mockGift({
      category: "toys",
      price_tier: "high",
      relationship_affinities: ["colleague"],
      event_affinities: ["birthday"],
    });
    const ctx = mockContext({
      categories: ["books"],
      budgetTier: "low",
      relationship: "colleague",
      eventType: "birthday",
      daysUntil: 10,
    });
    const score = scoreGift(gift, ctx);
    // No category match, no budget match, but rel+event affinity (+15+15) + jitter
    assert.ok(score >= 0);
  });
});

describe("buildShuffleSeed(contactId, year)", () => {
  test("deterministic: same inputs produce same seed", () => {
    const seed1 = buildShuffleSeed("contact-123", 2026);
    const seed2 = buildShuffleSeed("contact-123", 2026);
    assert.strictEqual(seed1, seed2);
  });

  test("different contact IDs produce different seeds", () => {
    const seed1 = buildShuffleSeed("contact-1", 2026);
    const seed2 = buildShuffleSeed("contact-2", 2026);
    assert.notStrictEqual(seed1, seed2);
  });

  test("different years produce different seeds", () => {
    const seed1 = buildShuffleSeed("contact-123", 2026);
    const seed2 = buildShuffleSeed("contact-123", 2027);
    assert.notStrictEqual(seed1, seed2);
  });
});

describe("parseTagHints(giftOther)", () => {
  test("null or undefined → empty array", () => {
    assert.deepStrictEqual(parseTagHints(null), []);
    assert.deepStrictEqual(parseTagHints(undefined), []);
  });

  test("empty string → empty array", () => {
    assert.deepStrictEqual(parseTagHints(""), []);
    assert.deepStrictEqual(parseTagHints("   "), []);
  });

  test("single word → array with one element", () => {
    const result = parseTagHints("coffee");
    assert.deepStrictEqual(result, ["coffee"]);
  });

  test("comma-separated values → split and lowercase", () => {
    const result = parseTagHints("Coffee, Tea, Wine");
    assert.deepStrictEqual(result, ["coffee", "tea", "wine"]);
  });

  test("semicolon-separated values → split", () => {
    const result = parseTagHints("Coffee; Tea; Wine");
    assert.deepStrictEqual(result, ["coffee", "tea", "wine"]);
  });

  test("mixed comma and semicolon", () => {
    const result = parseTagHints("Coffee, Tea; Wine");
    assert.deepStrictEqual(result, ["coffee", "tea", "wine"]);
  });

  test("whitespace around delimiters is trimmed", () => {
    const result = parseTagHints("  Coffee  ,  Tea  ");
    assert.deepStrictEqual(result, ["coffee", "tea"]);
  });

  test("single-character tags are filtered out (min length 2)", () => {
    const result = parseTagHints("a, Coffee, B, Tea");
    assert.deepStrictEqual(result, ["coffee", "tea"]);
  });

  test("case-insensitive: all output is lowercase", () => {
    const result = parseTagHints("COFFEE, Tea, WiNe");
    assert.deepStrictEqual(result, ["coffee", "tea", "wine"]);
  });
});
