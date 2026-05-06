import Link from "next/link";
import MarketingNav from "@/components/marketing-nav";
import MarketingFooter from "@/components/marketing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Daysight",
  description: "How Daysight handles your personal information. Written in plain English.",
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Legal review notice — remove before publishing */}
          <div className="mb-8 bg-amber-50 border border-amber-300 rounded-lg px-5 py-4 text-sm text-amber-800">
            <strong>⚠ Pending legal review.</strong> This policy has been updated for accuracy but
            has not yet been reviewed by a qualified lawyer. Do not publish to production until
            legal sign-off is obtained.
          </div>

          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Privacy Policy</h1>
            <p className="text-sm text-gray-400">
              Effective date: January 1, 2026 &middot; Last updated: May 4, 2026
            </p>
          </div>

          <div className="prose-daysight">
            <p>
              Daysight (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a free reminder
              service that helps you remember birthdays, anniversaries, and other important dates
              for the people you care about. This Privacy Policy explains what personal information
              we collect, how we use it, and your rights. We&apos;ve written it to be readable,
              not just legally complete.
            </p>
            <p>
              By using Daysight, you agree to the practices described here. If you don&apos;t
              agree, please don&apos;t use the service.
            </p>

            <h2>1. Information We Collect</h2>

            <h3>Account information</h3>
            <p>
              When you create an account, we collect your email address and, optionally, a display
              name. We do not collect your phone number, postal address, or payment information.
            </p>

            <h3>Contact and event data you enter</h3>
            <p>
              To send you reminders, you give us information about other people — their names,
              birthdays, anniversaries, your relationship to them, and their gift preferences. This
              data is stored solely to provide you with the service. We do not use it for
              advertising, profiling, or any purpose other than sending you reminders.
            </p>

            <h3>Usage and analytics data</h3>
            <p>
              We collect basic information about how you use the service — features used, emails
              opened or clicked, and whether a gift link led to a purchase. This helps us
              understand what&apos;s working and improve the product. When used for analytics, this
              data is anonymised and not linked to your identity.
            </p>

            <h3>Technical session data</h3>
            <p>
              We use strictly necessary cookies to keep you signed in. These are set by Supabase,
              our authentication provider, and are required for the service to function. We do not
              use analytics cookies, tracking pixels, or marketing cookies on our own site. When
              you click a gift link in a reminder email, the third-party retailer you visit may set
              their own cookies — see Section 4.
            </p>

            <h2>2. How We Use Your Information</h2>

            <p>
              The table below sets out each processing activity, its purpose, and the legal basis
              we rely on under GDPR Article 6. Where we rely on legitimate interests, we have
              balanced our interests against your rights and freedoms.
            </p>

            <div className="overflow-x-auto my-4">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 w-1/3">Processing activity</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 w-1/3">Purpose</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700 border-b border-gray-200 w-1/3">Legal basis (GDPR Art. 6)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Account registration and authentication</td>
                    <td className="px-4 py-3 text-gray-600">Create and secure your account</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(b)</strong> — performance of the contract you entered into with us</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Storing contact and event data</td>
                    <td className="px-4 py-3 text-gray-600">Provide the core reminder service</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(b)</strong> — performance of the contract</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Sending reminder emails with gift suggestions</td>
                    <td className="px-4 py-3 text-gray-600">Deliver the service you signed up for; include affiliate gift links that generate revenue to keep the service free</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(a)</strong> — your explicit consent at sign-up (you can withdraw at any time via the unsubscribe link)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Sending re-engagement emails to new users</td>
                    <td className="px-4 py-3 text-gray-600">Help new users who have not yet added contacts get value from the service</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(a)</strong> — your consent at sign-up</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Email delivery and open/click tracking</td>
                    <td className="px-4 py-3 text-gray-600">Confirm delivery, detect failures, and understand which gift suggestions are useful</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(f)</strong> — legitimate interests (improving deliverability and service quality)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Affiliate purchase attribution</td>
                    <td className="px-4 py-3 text-gray-600">Record that a purchase was referred by Daysight so we can receive a commission</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(f)</strong> — legitimate interests (sustainable revenue model that keeps the service free)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Anonymised usage analytics</td>
                    <td className="px-4 py-3 text-gray-600">Understand feature usage and improve the product</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(f)</strong> — legitimate interests (product improvement); data is anonymised before use</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-700">Responding to support messages</td>
                    <td className="px-4 py-3 text-gray-600">Answer your questions and resolve issues</td>
                    <td className="px-4 py-3 text-gray-600"><strong>6(1)(f)</strong> — legitimate interests (customer support)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>3. How We Share Your Information</h2>
            <p>We do not sell your personal information. We do not share it with advertisers. The limited ways we may share data are:</p>
            <ul>
              <li><strong>Service providers:</strong> companies that help us operate the service, including our authentication provider (Supabase), email delivery provider (Resend), and cloud hosting (Vercel). They are contractually required to process your data only as directed by us and may not use it for their own purposes.</li>
              <li><strong>Affiliate networks:</strong> when you click a gift link and complete a purchase, our affiliate partners receive a referral signal to attribute the commission. They do not receive your name, email address, or any contact data you have entered into Daysight.</li>
              <li><strong>Legal requirements:</strong> if required by law, court order, or to protect the rights and safety of users or the public, we may disclose information to competent authorities.</li>
              <li><strong>Business transfers:</strong> if Daysight is acquired or merged with another company, your data may transfer as part of that transaction. We will notify you before your data becomes subject to a materially different privacy policy.</li>
            </ul>

            <h2>4. Affiliate Links and Third-Party Sites</h2>
            <p>
              Daysight is free because we earn small commissions when you buy gifts through our
              recommended links. When you click a &ldquo;Buy Now&rdquo; link in a reminder email,
              you are directed to a third-party retailer. That retailer may set its own cookies and
              tracking technologies on your device to attribute the purchase.
            </p>
            <p>
              We are not responsible for the privacy practices of those third-party sites. We
              recommend reviewing their privacy policies before making a purchase.
            </p>

            <h2>5. Data Retention</h2>
            <ul>
              <li><strong>Active account data</strong> (profile, contacts, events) is kept for as long as your account is active.</li>
              <li><strong>Soft-deleted contacts and events</strong> are moved to a recycling bin and permanently purged within <strong>7 days</strong> of deletion. You can restore them from Settings within that window.</li>
              <li><strong>Your account</strong> can be deleted at any time from Settings. When you do, all personal data — your profile, contacts, events, and reminder history — is permanently deleted within <strong>7 days</strong>. Deletion is irreversible.</li>
              <li><strong>Anonymised, aggregated analytics</strong> (e.g. conversion event counts with no identifying fields) may be retained indefinitely for product improvement.</li>
              <li><strong>Support correspondence</strong> is retained for up to 2 years, then deleted.</li>
            </ul>

            <h2>6. Cookies</h2>
            <p>
              We use only <strong>strictly necessary cookies</strong> on the Daysight website. These
              are set by Supabase, our authentication provider, to maintain your signed-in session
              and cannot be disabled without breaking the service. We do not use analytics,
              advertising, or preference cookies on our own site, and we do not display a cookie
              consent banner because no non-essential cookies are set.
            </p>
            <p>
              Third-party retailers you visit after clicking a gift link may set their own cookies.
              Those cookies are governed by the retailer&apos;s own privacy policy.
            </p>

            <h2>7. Your Rights</h2>

            <h3>All users</h3>
            <ul>
              <li>You can access and update your account information in Settings at any time.</li>
              <li>You can delete individual contacts and events, or your entire account, from Settings.</li>
              <li>You can unsubscribe from all reminder emails using the unsubscribe link in any email, or by toggling email preferences in Settings.</li>
            </ul>

            <h3>California residents (CCPA / CPRA)</h3>
            <p>
              Under California privacy law, you have the right to know what personal information we
              collect and how it is used, to request deletion of your personal information, to
              correct inaccurate information, and to opt out of the sale or sharing of your personal
              information. <strong>We do not sell or share personal information.</strong> To exercise
              your rights, contact us at{" "}
              <a href="mailto:info@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                info@daysight.xyz
              </a>.
            </p>

            <h3>EEA, UK, and Swiss residents (GDPR / UK GDPR)</h3>
            <p>
              If you are located in the European Economic Area, United Kingdom, or Switzerland, you
              have the following rights under applicable data protection law:
            </p>
            <ul>
              <li><strong>Access (Art. 15):</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification (Art. 16):</strong> ask us to correct inaccurate or incomplete data.</li>
              <li><strong>Erasure (Art. 17):</strong> ask us to delete your personal data (subject to certain exceptions).</li>
              <li><strong>Restriction (Art. 18):</strong> ask us to restrict processing of your data in certain circumstances.</li>
              <li><strong>Portability (Art. 20):</strong> receive your personal data in a structured, machine-readable format.</li>
              <li><strong>Object (Art. 21):</strong> object to processing based on legitimate interests or for direct marketing.</li>
              <li><strong>Withdraw consent:</strong> where processing is based on consent (Art. 6(1)(a)), you may withdraw it at any time without affecting the lawfulness of prior processing — use the unsubscribe link in any email or contact us directly.</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:info@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                info@daysight.xyz
              </a>. We will respond within one calendar month. You also have the right to lodge a
              complaint with your supervisory authority — for example, the ICO in the UK, or your
              national data protection authority in the EEA.
            </p>

            <h2>8. Children&apos;s Privacy</h2>
            <p>
              Daysight is not directed at children under 13 (or under 16 where required by local
              law). We do not knowingly collect personal information from anyone under those ages.
              If you believe a child has provided us personal information, please contact us and we
              will delete it promptly.
            </p>

            <h2>9. Security</h2>
            <p>
              We use industry-standard measures to protect your data, including TLS encryption in
              transit, encrypted storage at rest, and row-level security in our database so that
              only you can access your own data. No method of transmission over the internet is
              100% secure, and we cannot guarantee absolute security. If you believe your account
              has been compromised, contact us immediately.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will update the
              &ldquo;Last updated&rdquo; date at the top. If changes are significant, we will
              notify you by email or by a prominent notice on the site at least 14 days before the
              changes take effect.
            </p>

            <h2>11. Contact Us</h2>
            <p>Questions about this policy or your data? We&apos;re happy to help.</p>
            <ul>
              <li>
                Email:{" "}
                <a href="mailto:info@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                  info@daysight.xyz
                </a>
              </li>
              <li>
                Web form:{" "}
                <Link href="/contact" className="text-brand-600 underline hover:text-brand-700">
                  Contact us
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
