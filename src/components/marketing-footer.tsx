import Link from "next/link";
import { DaysightLogo } from "@/components/logo";

/**
 * Shared footer for public/marketing pages.
 */
export default function MarketingFooter() {
  return (
    <footer className="py-12 px-6 bg-gray-900">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2">
            <DaysightLogo size={28} />
            <span className="text-white font-semibold">Daysight</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
          <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} Daysight</p>
        </div>
      </div>
    </footer>
  );
}
