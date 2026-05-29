/**
 * Unit tests for recycling-bin (soft-delete) logic.
 *
 * Covers the orphaned-event-restore decision (trash.ts) and the reminder
 * delete/recover behavior that's expressible via the pure window matcher.
 *
 * NOTE: the cron's deleted-row filtering (`.is("deleted_at", null)` on the
 * events+contacts join) and the cascade-restore timestamp match are DB-level
 * and not covered here — they'd need a Supabase integration harness, which this
 * project doesn't have. The window-matching tests below assert the logic that
 * decides whether a *recovered* event produces a reminder.
 *
 * Run with: `npx tsx src/__tests__/trash.test.ts`
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parentContactNeedsRestore,
  buildRestoreWithContactMessage,
} from "@/lib/trash";
import { matchReminderWindow } from "@/lib/reminders";

// ── parentContactNeedsRestore ─────────────────────────────────────────────────

describe("parentContactNeedsRestore(eventContactId, deletedContactIds)", () => {
  test("true when the event's contact is also in the bin", () => {
    assert.strictEqual(parentContactNeedsRestore("c1", ["c1", "c2"]), true);
  });

  test("false when the parent contact is active (not in the bin)", () => {
    assert.strictEqual(parentContactNeedsRestore("c1", ["c2", "c3"]), false);
  });

  test("false when there are no deleted contacts", () => {
    assert.strictEqual(parentContactNeedsRestore("c1", []), false);
  });

  test("accepts any iterable (e.g. a Set)", () => {
    assert.strictEqual(parentContactNeedsRestore("c1", new Set(["c1"])), true);
  });
});

describe("buildRestoreWithContactMessage(contactName)", () => {
  test("names the contact twice and asks to continue", () => {
    const msg = buildRestoreWithContactMessage("Jane Doe");
    assert.ok(msg.includes("Jane Doe"));
    assert.ok(/continue\?$/i.test(msg));
  });

  test("falls back to a generic phrase for a blank name", () => {
    const msg = buildRestoreWithContactMessage("   ");
    assert.ok(msg.startsWith("This event's contact"));
  });
});

// ── Reminder behavior after delete/recover ────────────────────────────────────
//
// Deletion removes the event from the cron's query, so no reminder fires while
// deleted. On recovery the cron recomputes daysUntil from the event's month/day
// every run, so reminder eligibility is purely a function of matchReminderWindow
// on the live daysUntil. These assertions encode the scenarios from the review.

describe("recovered-event reminder windows (default prefs [7,3])", () => {
  const prefs = [7, 3];

  test("event 4 days out falls in the gap → no reminder even when active", () => {
    assert.strictEqual(matchReminderWindow(4, false, prefs), null);
  });

  test("recovered on day 3 → matches the 3-day window", () => {
    const m = matchReminderWindow(3, false, prefs);
    assert.strictEqual(m?.canonicalDaysBefore, 3);
  });

  test("recovered late (2 days out) → still caught by 3-day late tolerance [2-3]", () => {
    const m = matchReminderWindow(2, false, prefs);
    assert.strictEqual(m?.canonicalDaysBefore, 3);
  });

  test("7-day reminder still matches at 7/6/5 days (independent tuple from the 3-day send)", () => {
    assert.strictEqual(matchReminderWindow(7, false, prefs)?.canonicalDaysBefore, 7);
    assert.strictEqual(matchReminderWindow(5, false, prefs)?.canonicalDaysBefore, 7);
  });
});
