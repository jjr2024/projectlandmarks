import Link from "next/link";
import { DaysightLogo } from "@/components/logo";

/**
 * Fixed top nav for public/marketing pages.
 * Not used on authenticated pages (those use sidebar.tsx or admin-sidebar.tsx).
 */
export default function MarketingNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <DaysightLogo size={32} />
          <span className="font-bold text-gray-900 text-lg">Daysight</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/auth" className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Sign in
          </Link>
          <Link
            href="/auth?mode=signup"
            className="text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
