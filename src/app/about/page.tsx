import Link from "next/link";
import MarketingNav from "@/components/marketing-nav";
import MarketingFooter from "@/components/marketing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us — Daysight",
  description: "Learn why Daysight exists, how we think about privacy, and how we keep the service free.",
};

export default function AboutPage() {
  return (
    <>
      <MarketingNav />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-24">
        {/* Origin story */}
        <section className="mb-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">About Daysight</h1>
          <div className="space-y-5 text-gray-600 leading-relaxed">
            <p>
              When I was a young finance professional in NYC, I remembered birthdays too
              late to actually do anything for them (if I remembered them at all!). I
              started Daysight to help you (and me!) stop making the same mistake.
            </p>
            <p>
              A calendar reminder the day-of at 9am isn&apos;t that helpful. Daysight
              sends you a heads-up early enough to act on it, with a gift idea so
              you&apos;re not scrambling.
            </p>
          </div>
        </section>

        {/* Privacy philosophy */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 pt-1.5">
                Privacy is the foundation, not a feature
              </h2>
            </div>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                The data you put into Daysight is personal: birthdays, relationships, the
                people who matter most to you. We will never sell, share, or monetize it.
                We don&apos;t track you across the web and we don&apos;t contact the people you add.
              </p>
              <p>
                You can export your data or delete your account at any time.
                No retention periods, no hidden backups, no hoops. When we say delete, we mean it.
              </p>
            </div>
          </div>
        </section>

        {/* How we make money */}
        <section className="mb-16">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 md:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 pt-1.5">
                How we keep the lights on
              </h2>
            </div>
            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                Daysight is free, and we plan to keep it that way. When we suggest a gift in your
                reminder email, that link is an affiliate link. If you buy through it, we earn a
                small commission at no extra cost to you. As an Amazon Associate we earn from
                qualifying purchases. That&apos;s the whole business model — no subscriptions, no
                ads, no data sales.
              </p>
              <p>
                You&apos;re never obligated to use our links. If you already know what to get,
                the reminder still does its job.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-brand-700 transition-colors text-base"
          >
            Get started — it&apos;s free
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
