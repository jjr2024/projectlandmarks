/**
 * Recycling-bin (soft-delete) helpers.
 *
 * Pure functions extracted from the Settings recycling-bin UI so the
 * delete/restore decision logic can be unit-tested without React or a DB.
 *
 * Tested in src/__tests__/trash.test.ts.
 */

/**
 * Whether restoring an event also requires restoring its parent contact.
 *
 * Returns true when the event's contact is itself currently in the bin
 * (soft-deleted). Restoring the event alone would orphan it: the contact list
 * and contact-detail page both filter out deleted contacts, so the event would
 * be invisible in the UI — and worse, the purge cron hard-deletes the still-
 * deleted contact after TRASH_HOLD_DAYS, cascading (FK ON DELETE CASCADE) to
 * silently destroy the "restored" event. The Settings bin uses this to gate a
 * confirmation prompt and restore the contact alongside the event.
 */
export function parentContactNeedsRestore(
  eventContactId: string,
  deletedContactIds: Iterable<string>
): boolean {
  for (const id of deletedContactIds) {
    if (id === eventContactId) return true;
  }
  return false;
}

/**
 * Confirmation copy shown before an event restore that will also restore the
 * parent contact. Kept pure (no UI deps) so the wording is testable.
 */
export function buildRestoreWithContactMessage(contactName: string): string {
  const name = contactName.trim() || "This event's contact";
  return `${name} is also in the recycling bin. Restoring this event will also restore ${name}. Continue?`;
}
