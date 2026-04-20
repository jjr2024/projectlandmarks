import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service_role key.
 * Bypasses Row-Level Security — use ONLY in server-side contexts
 * (API routes, cron jobs) where we need cross-user data access.
 *
 * NEVER import this in client components or expose the service_role key.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
