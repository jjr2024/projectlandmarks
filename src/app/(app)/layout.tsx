import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/sidebar";
import EmailVerificationBanner from "@/components/email-verification-banner";

export default async function AppLayout({
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

  // Fetch profile for sidebar display
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User";
  const email = user.email || "";

  // Supabase Auth tracks email confirmation via email_confirmed_at
  const emailVerified = !!user.email_confirmed_at;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar displayName={displayName} email={email} />
      <main className="md:ml-64 min-h-screen">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {!emailVerified && <EmailVerificationBanner />}
          {children}
        </div>
      </main>
    </div>
  );
}
