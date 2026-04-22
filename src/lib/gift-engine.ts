/**
 * Daysight — Gift Recommendation Engine (Phase 6)
 *
 * Deterministic weighted scoring function. No LLM — per-query cost is zero.
 * Fetches active gifts from gift_catalog, scores each against the contact/event
 * context, penalizes recently shown gifts, applies seeded shuffle for variety,
 * and returns the top N.
 *
 * SCORING WEIGHTS (tuned for relevance, see § Gift Engine in CLAUDE.md):
 *   Category match:      +40  (hard filter in query, but double-weighted in score)
 *   Budget tier match:   +20
 *   Relationship affinity:+15  (gift's relationship_affinities includes contact's relationship)
 *   Event affinity:      +15  (gift's event_affinities includes event_type)
 *   Tag overlap:         +3 per matching tag (contact.gift_other words vs gift.tags)
 *   Last-minute bonus:   +10  when daysUntil ≤ 2 and gift.is_last_minute
 *   Last-minute penalty: -20  when daysUntil ≤ 2 and NOT is_last_minute
 *   Repeat penalty:      -25  per time shown to this contact in past 2 years
 *   Seeded shuffle:      ±0–9 deterministic jitter (contact_id + year seed)
 *
 * The engine fetches broadly (all active gifts in matching categories), scores
 * in application code, and returns the top 3. This keeps the Postgres query
 * simple and the scoring logic testable as a pure function.
 */

import { REMINDER_WINDOWS } from "@/lib/email-config";

// ── Types ───────────────────────────────────────────────────────────────────

export interface GiftRow {
  id: string;
  name: string;
  partner: string;
  affiliate_url: string;
  image_url: string | null;
  category: string;
  price_tier: string;
  tags: string[];
  relationship_affinities: string[];
  event_affinities: string[];
  is_last_minute: boolean;
  is_active: boolean;
}

export interface ScoringContext {
  /** Contact's preferred gift categories (e.g. ['flowers','treats']) */
  categories: string[];
  /** Contact's budget tier ('low'|'mid'|'high') or null */
  budgetTier: string | null;
  /** Contact's relationship type ('family'|'friend'|'colleague'|'other') */
  relationship: string;
  /** Event type ('birthday'|'anniversary'|'custom') */
  eventType: string;
  /** Free-text gift preferences, split into lowercase tokens */
  tagHints: string[];
  /** Days until event — affects last-minute scoring */
  daysUntil: number;
  /** Gift IDs previously shown to this contact (from shown_gifts) */
  previousGiftIds: Set<string>;
  /** Counts: how many times each gift_id was shown (for graduated penalty) */
  repeatCounts: Map<string, number>;
  /** Deterministic seed for shuffle jitter (e.g. hash of contact_id + year) */
  shuffleSeed: number;
}

export interface ScoredGift extends GiftRow {
  _score: number;
}

// ── Weights ─────────────────────────────────────────────────────────────────

const W = {
  CATEGORY_MATCH:      40,
  BUDGET_MATCH:        20,
  RELATIONSHIP_MATCH:  15,
  EVENT_MATCH:         15,
  TAG_OVERLAP:          3,   // per matching tag
  LAST_MINUTE_BONUS:   10,
  LAST_MINUTE_PENALTY: -20,
  REPEAT_PENALTY:      -25,  // per occurrence in past 2 years
  SHUFFLE_RANGE:        9,   // max jitter added
} as const;

// ── Pure scoring function (testable without DB) ─────────────────────────────

export function scoreGift(gift: GiftRow, ctx: ScoringContext): number {
  let score = 0;

  // Category match (gifts are pre-filtered by query, but score rewards exact match)
  if (ctx.categories.includes(gift.category)) {
    score += W.CATEGORY_MATCH;
  }

  // Budget tier match
  if (ctx.budgetTier && gift.price_tier === ctx.budgetTier) {
    score += W.BUDGET_MATCH;
  }

  // Relationship affinity
  if (gift.relationship_affinities.includes(ctx.relationship)) {
    score += W.RELATIONSHIP_MATCH;
  }

  // Event type affinity
  if (gift.event_affinities.includes(ctx.eventType)) {
    score += W.EVENT_MATCH;
  }

  // Tag overlap: compare gift.tags against contact's free-text hints
  if (ctx.tagHints.length > 0 && gift.tags.length > 0) {
    const giftTagsLower = gift.tags.map((t) => t.toLowerCase());
    for (const hint of ctx.tagHints) {
      if (giftTagsLower.some((t) => t === hint)) {
        score += W.TAG_OVERLAP;
      }
    }
  }

  // Last-minute handling
  if (ctx.daysUntil <= REMINDER_WINDOWS.LAST_MINUTE) {
    score += gift.is_last_minute ? W.LAST_MINUTE_BONUS : W.LAST_MINUTE_PENALTY;
  }

  // Repeat penalty (graduated — shown twice = 2× penalty)
  const repeats = ctx.repeatCounts.get(gift.id) || 0;
  if (repeats > 0) {
    score += W.REPEAT_PENALTY * repeats;
  }

  // Seeded deterministic jitter for variety
  score += seededJitter(gift.id, ctx.shuffleSeed, W.SHUFFLE_RANGE);

  return score;
}

// ── Deterministic jitter ────────────────────────────────────────────────────
// Simple hash-based: takes gift.id chars + seed, produces 0..range integer.
// Same inputs always produce same output. Different gifts get different jitter.

function seededJitter(giftId: string, seed: number, range: number): number {
  let hash = seed;
  for (let i = 0; i < giftId.length; i++) {
    hash = ((hash << 5) - hash + giftId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash % (range + 1));
}

// ── Seed from contact_id + year (deterministic per contact per year) ────────

export function buildShuffleSeed(contactId: string, year: number): number {
  let hash = year;
  for (let i = 0; i < contactId.length; i++) {
    hash = ((hash << 5) - hash + contactId.charCodeAt(i)) | 0;
  }
  return hash;
}

// ── Parse free-text gift hints into lowercase tokens ────────────────────────

export function parseTagHints(giftOther: string | null | undefined): string[] {
  if (!giftOther || !giftOther.trim()) return [];
  return giftOther
    .toLowerCase()
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

// ── Full pipeline: query → score → rank → return top N ──────────────────────

export async function selectGiftsScored(
  supabase: any,
  contact: any,
  event: any,
  daysUntil: number,
  currentYear: number,
  topN: number = 3,
): Promise<GiftRow[]> {
  // 1. Determine categories to query
  const categories: string[] =
    contact.gift_categories?.length > 0
      ? contact.gift_categories
      : ["flowers", "gift_card"];

  // 2. Fetch candidate gifts — broad query, scoring narrows later
  //    Include all active gifts in matching categories.
  //    If last-minute, also include last-minute gifts from OTHER categories as fallback.
  let query = supabase
    .from("gift_catalog")
    .select("*")
    .eq("is_active", true);

  if (daysUntil <= REMINDER_WINDOWS.LAST_MINUTE) {
    // Broaden: preferred categories OR any last-minute item
    // Supabase .or() filter:
    query = query.or(
      `category.in.(${categories.map((c: string) => `"${c}"`).join(",")}),is_last_minute.eq.true`
    );
  } else {
    query = query.in("category", categories);
  }

  // 3. Fetch shown_gifts history for repeat penalty (past 2 years)
  const { data: shownHistory } = await supabase
    .from("shown_gifts")
    .select("gift_id")
    .eq("contact_id", contact.id)
    .gte("year", currentYear - 2);

  const repeatCounts = new Map<string, number>();
  const previousGiftIds = new Set<string>();
  if (shownHistory) {
    for (const row of shownHistory) {
      if (row.gift_id) {
        previousGiftIds.add(row.gift_id);
        repeatCounts.set(row.gift_id, (repeatCounts.get(row.gift_id) || 0) + 1);
      }
    }
  }

  // 4. Build scoring context
  const ctx: ScoringContext = {
    categories,
    budgetTier: contact.budget_tier || null,
    relationship: contact.relationship || "other",
    eventType: event.event_type || "birthday",
    tagHints: parseTagHints(contact.gift_other),
    daysUntil,
    previousGiftIds,
    repeatCounts,
    shuffleSeed: buildShuffleSeed(contact.id, currentYear),
  };

  const { data: candidates } = await query.limit(50);
  if (!candidates || candidates.length === 0) {
    // Ultimate fallback: score any active gifts through the same pipeline
    const { data: fallback } = await supabase
      .from("gift_catalog")
      .select("*")
      .eq("is_active", true)
      .limit(50);

    if (!fallback || fallback.length === 0) return [];

    // Score the fallback gifts through the same pipeline instead of returning unranked
    const fallbackScored: ScoredGift[] = fallback.map((gift: GiftRow) => ({
      ...gift,
      _score: scoreGift(gift, ctx),
    }));

    fallbackScored.sort((a, b) => b._score - a._score);
    return fallbackScored.slice(0, topN);
  }

  // 5. Score all candidates
  const scored: ScoredGift[] = candidates.map((gift: GiftRow) => ({
    ...gift,
    _score: scoreGift(gift, ctx),
  }));

  // 6. Sort descending by score, take top N
  scored.sort((a, b) => b._score - a._score);
  return scored.slice(0, topN);
}
