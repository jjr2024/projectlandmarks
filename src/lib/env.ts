/**
 * Environment variable validation.
 *
 * Call validateServerEnv() from server-side code (API routes, cron jobs) to
 * fail fast when required env vars are missing. This catches deployment
 * misconfigurations before they cause cryptic runtime errors.
 *
 * Client-side env vars (NEXT_PUBLIC_*) are validated separately because they're
 * inlined at build time — if they're missing, the build itself should catch it.
 */

const REQUIRED_SERVER_VARS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "CRON_SECRET",
  "RESEND_WEBHOOK_SECRET",
  "AFFILIATE_WEBHOOK_SECRET",
] as const;

const REQUIRED_PUBLIC_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

let _validated = false;

/**
 * Validates that all required server-side environment variables are set.
 * Throws on first missing var. Safe to call multiple times (no-ops after first).
 */
export function validateServerEnv(): void {
  if (_validated) return;

  const missing: string[] = [];

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of REQUIRED_PUBLIC_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Check .env.local (dev) or Vercel dashboard (prod).`
    );
  }

  _validated = true;
}
