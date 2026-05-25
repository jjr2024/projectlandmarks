import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
    .select("consent_terms")
    .eq("id", user.id)
    .single();

  if (!profile?.consent_terms) {
    redirect("/consent");
  }

  return <>{children}</>;
}
