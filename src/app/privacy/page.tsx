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
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Privacy Policy</h1>
            <p className="text-sm text-gray-400">
              Effective date: January 1, 2026 &middot; Last updated: January 1, 2026
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
              name. That&apos;s it — we don&apos;t ask for your phone number, address, or payment
              information.
            </p>

            <h3>Contact and event data you enter</h3>
            <p>
              To send you reminders, you give us information about other people — their names,
              birthdays, anniversaries, your relationship to them, and their gift preferences. This
              data is stored solely to provide you with the service. We don&apos;t use it for
              advertising, profiling, or any purpose other than sending you reminders.
            </p>

            <h3>Usage data</h3>
            <p>
              We collect basic information about how you use the service — pages visited, features
              used, and general session activity. This helps us understand what&apos;s working and
              improve the product. This data is not linked to your identity when used for analytics.
            </p>

            <h3>Cookies and similar technologies</h3>
            <p>
              We use cookies to keep you signed in and to understand site usage. When you first
              visit, we ask for your consent before setting any non-essential cookies. See Section 6
              for details.
            </p>

            <h2>2. How We Use Your Information</h2>
            <ul>
              <li><strong>To provide the service</strong> — sending you reminder emails before the dates you&apos;ve entered.</li>
              <li><strong>To improve the service</strong> — understanding how people use Daysight so we can make it better.</li>
              <li><strong>To communicate with you</strong> — responding to questions or support requests you send us.</li>
              <li><strong>To earn revenue through affiliate commissions</strong> — our reminder emails include gift links. If you click one and make a purchase, an affiliate partner may record the referral and pay us a commission. See Section 4 for details.</li>
            </ul>

            <h2>3. How We Share Your Information</h2>
            <p>We do not sell your personal information. We do not share it with advertisers. The limited ways we may share data are:</p>
            <ul>
              <li><strong>Service providers</strong> — companies that help us operate the service, such as our email delivery provider and cloud hosting. They are contractually required to use your data only as directed by us.</li>
              <li><strong>Affiliate networks</strong> — when you click a gift link and make a purchase, our affiliate partners receive a referral signal (typically a tracking cookie on your browser). They do not receive your name, email address, or any contact data you&apos;ve entered into Daysight.</li>
              <li><strong>Legal requirements</strong> — if required by law, court order, or to protect the rights and safety of users or the public, we may disclose information to authorities.</li>
              <li><strong>Business transfers</strong> — if Daysight is acquired or merged with another company, your data may transfer as part of that transaction. We&apos;ll notify you before your data becomes subject to a different privacy policy.</li>
            </ul>

            <h2>4. Affiliate Links</h2>
            <p>
              Daysight is free because we earn small commissions when you buy gifts through our
              recommended links. When you click a &quot;Buy Now&quot; link in a reminder email, you
              are directed to a third-party retailer. That retailer may set its own cookies on your
              device to track the purchase and pay us a commission.
            </p>
            <p>
              We are not responsible for the privacy practices of those third-party sites. We
              recommend reviewing their privacy policies before making a purchase.
            </p>

            <h2>5. Data Retention</h2>
            <p>
              We keep your data for as long as your account is active. You can delete your account
              at any time from Settings. When you do, we permanently delete your account data,
              contact data, and event data within 30 days. We may retain anonymized, aggregated data
              that cannot be linked back to you.
            </p>

            <h2>6. Cookies</h2>
            <p>We use three categories of cookies:</p>
            <ul>
              <li><strong>Strictly necessary</strong> — required to keep you logged in and remember your preferences. These are always active and cannot be disabled.</li>
              <li><strong>Analytics</strong> — help us understand which pages are visited and how the service is used. No personal data is shared with third parties for analytics.</li>
              <li><strong>Marketing and affiliate tracking</strong> — allows affiliate partners to confirm a purchase was referred by Daysight. This is how we earn commissions that keep the service free.</li>
            </ul>
            <p>
              When you first visit, a banner lets you Accept All, Decline All, or Customize your
              cookie preferences. You can change your choices at any time by clearing your
              browser&apos;s local storage for this site.
            </p>

            <h2>7. Your Rights</h2>

            <h3>All users</h3>
            <ul>
              <li>You can access, update, or delete your account information in Settings at any time.</li>
              <li>You can export your contact and event data from Settings.</li>
              <li>You can unsubscribe from reminder emails using the unsubscribe link in any email we send.</li>
            </ul>

            <h3>California residents (CCPA)</h3>
            <p>
              Under the California Consumer Privacy Act, you have the right to know what personal
              information we collect and how it&apos;s used, request deletion of your personal
              information, and opt out of the sale of your personal information.{" "}
              <strong>We do not sell personal information.</strong> To exercise your rights, contact
              us at{" "}
              <a href="mailto:hello@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                hello@daysight.xyz
              </a>.
            </p>

            <h3>European residents (GDPR)</h3>
            <p>
              If you are located in the European Economic Area (EEA) or United Kingdom, you have
              the right to access, rectify, erase, or restrict processing of your personal data;
              the right to data portability; and the right to object to certain processing. Our
              legal basis for processing your data is the performance of a contract (providing the
              service you signed up for) and, where required, your explicit consent. To exercise
              your rights, contact us at{" "}
              <a href="mailto:hello@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                hello@daysight.xyz
              </a>. You also have the right to lodge a complaint with your local data protection
              authority.
            </p>

            <h2>8. Children&apos;s Privacy</h2>
            <p>
              Daysight is not directed at children under 13. We do not knowingly collect personal
              information from anyone under 13. If you believe a child under 13 has provided us
              personal information, please contact us and we will delete it promptly.
            </p>

            <h2>9. Security</h2>
            <p>
              We use industry-standard measures to protect your data, including encryption in
              transit (HTTPS) and at rest. No method of transmission over the internet is 100%
              secure, and we cannot guarantee absolute security. If you believe your account has
              been compromised, contact us immediately.
            </p>

            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we&apos;ll update
              the &quot;Last updated&quot; date at the top. If changes are significant, we&apos;ll
              let you know by email or by a notice on the site.
            </p>

            <h2>11. Contact Us</h2>
            <p>Questions about this policy or your data? We&apos;re happy to help.</p>
            <ul>
              <li>
                Email:{" "}
                <a href="mailto:hello@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                  hello@daysight.xyz
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
