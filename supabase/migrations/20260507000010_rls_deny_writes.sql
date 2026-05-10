-- Migration 010: Add explicit RLS deny policies for server-only tables
--
-- reminder_log and shown_gifts previously had RLS enabled with only SELECT
-- policies. While Supabase's implicit deny blocks writes by default, explicit
-- restrictive policies are defense-in-depth against misconfiguration.
--
-- These tables are written to only by cron routes using the service_role key
-- (which bypasses RLS entirely), so denying all authenticated-user writes
-- has zero impact on functionality.

-- ── reminder_log: deny INSERT/UPDATE/DELETE for authenticated users ──

CREATE POLICY "Deny user inserts on reminder_log"
ON public.reminder_log
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny user updates on reminder_log"
ON public.reminder_log
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Deny user deletes on reminder_log"
ON public.reminder_log
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- ── shown_gifts: deny INSERT/UPDATE/DELETE for authenticated users ──

CREATE POLICY "Deny user inserts on shown_gifts"
ON public.shown_gifts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Deny user updates on shown_gifts"
ON public.shown_gifts
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Deny user deletes on shown_gifts"
ON public.shown_gifts
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);
