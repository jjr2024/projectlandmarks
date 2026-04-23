import Link from "next/link";
import MarketingNav from "@/components/marketing-nav";
import MarketingFooter from "@/components/marketing-footer";
import { DaysightLogo } from "@/components/logo";

/**
 * Landing page — full marketing page ported from prototype index.html.
 * Not in (marketing) route group because it serves "/" directly.
 * Includes its own nav/footer since the hero has unique styling.
 */
export default function Home() {
  return (
    <>
      <MarketingNav />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-brand-50 via-brand-100/40 to-white pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-sm font-medium px-3 py-1.5 rounded-full mb-8">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
            Free, always
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Never forget the days
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              that matter.
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Daysight sends you a heads-up before the birthdays and anniversaries
            you don&apos;t want to miss, with gift ideas ready to go.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?mode=signup"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all shadow-lg shadow-brand-200 hover:shadow-brand-300"
            >
              Add your contacts free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-8 py-4 rounded-xl text-lg border border-gray-200 transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Five minutes to set up, then it runs in the background from there.
          </p>
        </div>

        {/* Email mockup */}
        <div className="max-w-lg mx-auto mt-20">
          <div className="rounded-2xl overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500 text-center">
                Your Inbox
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <DaysightLogo size={32} />
                <div>
                  <div className="text-xs text-gray-500">From: Daysight</div>
                  <div className="font-semibold text-gray-900 text-sm">
                    Your mom Sarah&apos;s birthday is in 7 days
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Hi Alex — Sarah&apos;s birthday is <strong>March 31st</strong>. Here are a few
                ideas she&apos;d love:
              </p>
              <div className="space-y-2 mb-4">
                <EmailMockGift name="Tulip Bouquet from Bouqs" detail="From $49 · Free delivery" />
                <EmailMockGift name="Amazon Gift Card" detail="Any amount · Instant delivery" />
              </div>
              <p className="text-xs text-gray-400 text-center">
                Daysight · Edit preferences · Unsubscribe
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Set it up once, and it works from there
            </h2>
            <p className="text-lg text-gray-500">
              You won&apos;t need to check another app or maintain another calendar. You&apos;ll
              just get a helpful email when a date is coming up.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step={1}
              title="Add your people"
              description="Enter the names, dates, and relationships you want to keep track of. Most people finish their whole list in about five minutes."
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              }
            />
            <StepCard
              step={2}
              title="Pick gift preferences"
              description="Tell us what each person is into (flowers, wine, experiences, gift cards) and we'll match our suggestions to them."
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              }
            />
            <StepCard
              step={3}
              title="Get reminded with a plan"
              description="A week out and again three days before, you get an email with gift ideas picked for that person and links to buy them."
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              }
            />
          </div>
        </div>
      </section>

      {/* ── Why it's different ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Calendar reminders tell you <em>when</em>.
                <br />
                Daysight tells you{" "}
                <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                  what to do.
                </span>
              </h2>
              <div className="space-y-5">
                <BenefitRow title="Gift ideas matched to each person" description="Not generic &quot;top 10 gifts&quot; lists. Suggestions are based on the preferences you set for that specific person." />
                <BenefitRow title="One click to buy" description="Every suggestion links straight to the product page, so you can go from &quot;oh right, that's coming up&quot; to &quot;ordered&quot; in about ten seconds." />
                <BenefitRow title="100% free" description="We earn a small commission if you buy through one of our links. As an Amazon Associate we earn from qualifying purchases. You never pay anything to use Daysight." />
                <BenefitRow title="Your data stays yours" description="We encrypt everything, we don't sell or share any of it, and we only keep what we actually need to send your reminders." />
              </div>
            </div>
            <div className="space-y-4">
              {/* Calendar comparison */}
              <div className="bg-white rounded-2xl p-6 border border-red-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="font-semibold text-gray-700">Google Calendar says:</div>
                </div>
                <p className="text-gray-500 italic text-sm">&quot;Sarah&apos;s Birthday&quot;</p>
                <p className="text-xs text-red-500 mt-2">...and then you&apos;re on your own.</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-green-200 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full -mr-10 -mt-10 opacity-50" />
                <div className="flex items-center gap-3 mb-3 relative">
                  <DaysightLogo size={32} />
                  <div className="font-semibold text-gray-700">Daysight says:</div>
                </div>
                <p className="text-gray-700 text-sm relative">
                  &quot;Sarah&apos;s birthday is in <strong>7 days</strong>. She loves tulips.
                  Here are 3 options from $39.&quot;
                </p>
                <p className="text-xs text-green-600 mt-2 font-medium relative">
                  Handled before you finish your coffee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-brand-600">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Five minutes now, one less thing to worry about later
          </h2>
          <p className="text-brand-200 text-lg mb-10">
            No credit card, no subscription. Just a free account and you&apos;re set.
          </p>
          <Link
            href="/auth?mode=signup"
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-brand-600 font-bold px-10 py-4 rounded-xl text-lg transition-all shadow-xl"
          >
            Create your free account
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-brand-200 text-sm">
            <span className="flex items-center gap-1">
              <CheckIcon /> Free, always
            </span>
            <span className="flex items-center gap-1">
              <CheckIcon /> No spam
            </span>
            <span className="flex items-center gap-1">
              <CheckIcon /> Your data stays yours
            </span>
          </div>
        </div>
      </section>

      {/* ── Privacy promise ────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              We take your privacy seriously
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              You&apos;re trusting us with names, dates, and relationships that matter to you. We
              think that deserves a clear commitment about how we handle that information.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PrivacyCard
              title="We don't sell your data"
              description="Not to advertisers, not to data brokers, not to anyone. Your contact list and the dates in it aren't a product we sell."
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              }
            />
            <PrivacyCard
              title="Everything is encrypted"
              description="Your personal data is encrypted both when it's stored and when it's moving between your browser and our servers."
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              }
            />
            <PrivacyCard
              title="Delete anytime, no questions asked"
              description="You can export all your data or permanently delete your account whenever you want. No waiting period and no hoops."
              icon={
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              }
            />
          </div>
          <p className="text-center text-sm text-gray-400 mt-10">
            Our full{" "}
            <Link href="/privacy" className="underline text-brand-600 hover:text-brand-700">
              Privacy Policy
            </Link>{" "}
            is short and written in plain English. We&apos;d actually like you to read it.
          </p>
        </div>
      </section>

      {/* ── How does Daysight make money? ──────────────────────────────────── */}
      <section className="py-16 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">How does Daysight make money?</h2>
          <p className="text-gray-500 leading-relaxed">
            When you buy a gift through one of our links, the retailer pays us a small commission.
            That&apos;s the entire business model. We don&apos;t sell your data, we don&apos;t run
            ads, and we don&apos;t charge you for anything. Our incentive is to recommend things
            worth buying, because that&apos;s the only way we get paid.
          </p>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function EmailMockGift({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
      <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
        <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{name}</div>
        <div className="text-xs text-gray-500">{detail}</div>
      </div>
      <span className="bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
        Buy Now
      </span>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
  icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="text-center p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all">
      <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <div className="text-3xl font-bold text-brand-600 mb-2">{step}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </div>
  );
}

function BenefitRow({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <div className="font-semibold text-gray-900 mb-1">{title}</div>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
    </div>
  );
}

function PrivacyCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="text-center p-8 rounded-2xl border border-gray-100 bg-gray-50">
      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-5">
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}
