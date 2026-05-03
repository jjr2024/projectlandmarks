/**
 * User-friendly error mapping for Supabase and auth errors.
 *
 * Raw Supabase errors can expose table names, constraint names, and internal
 * Postgres error codes. This utility maps known codes to friendly messages and
 * falls back to a generic message for anything unrecognized.
 *
 * Usage:
 *   import { friendlyError } from "@/lib/errors";
 *   setSaveError(friendlyError(error, "save this contact"));
 */

interface SupabaseError {
  message?: string;
  code?: string;
  details?: string;
}

const KNOWN_CODES: Record<string, string> = {
  // Postgres constraint violations
  "23505": "This record already exists. Please check for duplicates.",
  "23503": "This record is linked to other data and can't be changed right now.",
  "23502": "A required field is missing. Please fill in all required fields.",
  "23514": "One of the values entered is not valid. Please check your inputs.",
  // Supabase RLS / auth
  "42501": "You don't have permission to perform this action.",
  "PGRST301": "You don't have permission to perform this action.",
  // Rate limiting
  "429": "Too many requests. Please wait a moment and try again.",
};

const KNOWN_MESSAGES: Array<[RegExp, string]> = [
  [/rate limit/i, "Too many requests. Please wait a moment and try again."],
  [/row-level security/i, "You don't have permission to perform this action."],
  [/jwt expired/i, "Your session has expired. Please sign in again."],
  [/refresh_token_not_found/i, "Your session has expired. Please sign in again."],
  [/duplicate key/i, "This record already exists. Please check for duplicates."],
  [/foreign key/i, "This record is linked to other data and can't be changed right now."],
  [/not_null_violation/i, "A required field is missing. Please fill in all required fields."],
];

/**
 * Convert a Supabase/Postgres error into a user-friendly message.
 *
 * @param error  The error object from Supabase (or null/undefined)
 * @param action Optional verb phrase for the fallback, e.g. "save this contact"
 * @returns A user-friendly error string (never exposes internals)
 */
export function friendlyError(
  error: SupabaseError | null | undefined,
  action?: string
): string {
  if (!error) {
    return action
      ? `Something went wrong trying to ${action}. Please try again.`
      : "Something went wrong. Please try again.";
  }

  // Check by Postgres/Supabase error code first
  if (error.code && KNOWN_CODES[error.code]) {
    return KNOWN_CODES[error.code];
  }

  // Check message against known patterns
  const msg = error.message || "";
  for (const [pattern, friendly] of KNOWN_MESSAGES) {
    if (pattern.test(msg)) {
      return friendly;
    }
  }

  // Generic fallback — never expose the raw message
  return action
    ? `Failed to ${action}. Please try again.`
    : "Something went wrong. Please try again.";
}
