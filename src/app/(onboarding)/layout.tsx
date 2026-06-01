import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Reads per-request profile state (consent + onboarding_completed) to gate the
// flow. Force dynamic so the Supabase `profiles` fetch isn't served stale from
// Next's Data Cache — otherwise a just-completed user can be read as still
// incomplete, contributing to an onboarding redirect loop with (app)/layout.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Consent gate — mirrors the check in (app)/layout.tsx.
  // Without this, a user who navigates directly to /onboarding can bypass
  // the /consent page and proceed without accepting Terms, violating the
  // consent architecture. See bug sweep C2.
  const { data: profile } = await supabase
    .from("profiles")
    .select("consent_terms, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.consent_terms) {
    redirect("/consent");
  }

  // Users who have already finished onboarding shouldn't be able to re-run it.
  // Send them to the dashboard (mirrors the gate in (app)/layout.tsx).
  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
