import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin-sidebar";

/**
 * Admin layout — wraps /admin, /admin/queue, /admin/gifts.
 * Server-side is_admin check: non-admins are redirected to /dashboard.
 */
export default async function AdminLayout({
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

  // Check admin flag
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  const displayName = profile.display_name || user.email?.split("@")[0] || "Admin";
  const email = user.email || "";

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar displayName={displayName} email={email} />
      <main className="md:ml-64 min-h-screen">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
