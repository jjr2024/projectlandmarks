import Link from "next/link";
import MarketingNav from "@/components/marketing-nav";
import MarketingFooter from "@/components/marketing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Daysight",
  description: "Terms governing your use of the Daysight reminder service.",
};

export default function TermsPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-28 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Terms of Service</h1>
            <p className="text-sm text-gray-400">
              Effective date: January 1, 2026 &middot; Last updated: January 1, 2026
            </p>
          </div>

          <div className="prose-daysight">
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of Daysight (&quot;we,&quot;
              &quot;us,&quot; or &quot;our&quot;), a free birthday and anniversary reminder service.
              By creating an account or using the service, you agree to these Terms.
            </p>

            <h2>1. The Service</h2>
            <p>
              Daysight is a free service that helps you remember important dates for the people in
              your life and suggests gift ideas when those dates approach. We earn revenue through
              affiliate commissions when you purchase gifts using links in our reminder emails. The
              service is free to you and will remain free.
            </p>

            <h2>2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use Daysight. By using the service, you
              represent that you meet this requirement. If you are between 13 and 18, you represent
              that you have your parent or guardian&apos;s permission to use the service.
            </p>

            <h2>3. Your Account</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activity that occurs under your account. You agree to notify us
              immediately at{" "}
              <a href="mailto:hello@daysight.xyz" className="text-brand-600 underline hover:text-brand-700">
                hello@daysight.xyz
              </a>{" "}
              if you suspect unauthorized access to your account. We are not liable for losses
              caused by unauthorized use of your account.
            </p>
            <p>
              You may not create accounts using automated means or create accounts on behalf of
              others without their permission.
            </p>

            <h2>4. Contact Data and Third-Party Privacy</h2>
            <p>
              Daysight stores personal information you enter about other people — names, birthdays,
              anniversaries, and gift preferences. By entering this information, you represent
              that:
            </p>
            <ul>
              <li>You have a legitimate personal relationship with the individuals whose information you enter.</li>
              <li>You are using this information solely for personal, non-commercial purposes.</li>
              <li>You will not use the service in any way that violates the privacy rights of the individuals you enter.</li>
            </ul>
            <p>
              We do not contact the people you enter into Daysight, sell their information, or use
              it for any purpose other than providing you with reminders.
            </p>

            <h2>5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts.</li>
              <li>Use automated tools to scrape, crawl, or extract data from the service.</li>
              <li>Interfere with or disrupt the integrity or performance of the service.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation.</li>
              <li>Use the service to send spam or unsolicited commercial communications.</li>
            </ul>

            <h2>6. Affiliate Links and Third-Party Purchases</h2>
            <p>
              Our reminder emails include links to third-party retailers. When you click these
              links and make a purchase, we may earn a commission at no additional cost to you.
              This is how we keep the service free.
            </p>
            <p>
              We are not a party to any transaction between you and a retailer. We do not control
              the retailers&apos; pricing, availability, fulfillment, or return policies. Any
              disputes about a purchase must be resolved directly with the retailer.
            </p>

            <h2>7. Intellectual Property</h2>
            <p>
              The Daysight service, including its design, code, and content, is owned by us and
              protected by applicable intellectual property laws. You may not copy, modify,
              distribute, sell, or lease any part of the service without our written permission.
            </p>
            <p>
              You retain ownership of all data you enter into the service. By entering this data,
              you grant us a limited license to use it solely to provide the service to you.
            </p>

            <h2>8. Disclaimers</h2>
            <p className="uppercase text-xs leading-relaxed tracking-wide">
              The service is provided &quot;as is&quot; and &quot;as available&quot; without
              warranties of any kind, express or implied, including but not limited to warranties
              of merchantability, fitness for a particular purpose, or non-infringement. We do not
              warrant that the service will be uninterrupted, error-free, or free of viruses or
              other harmful components.
            </p>
            <p>
              In plain English: we&apos;ll do our best to make sure your reminders go out, but we
              can&apos;t promise the service will never have downtime or miss an email. Don&apos;t
              rely on Daysight as your only method of remembering critical events.
            </p>

            <h2>9. Limitation of Liability</h2>
            <p className="uppercase text-xs leading-relaxed tracking-wide">
              To the maximum extent permitted by applicable law, Daysight and its officers,
              employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including lost profits, arising out of or related
              to your use of the service. Our total liability shall not exceed $50.
            </p>

            <h2>10. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Daysight and its affiliates, officers,
              agents, and employees from any claim, loss, or damage arising out of your use of the
              service, your violation of these Terms, or your violation of any third party&apos;s
              rights.
            </p>

            <h2>11. Termination</h2>
            <p>
              You may stop using the service and delete your account at any time from Settings. We
              may suspend or terminate your access at any time, with or without cause, and with or
              without notice. Upon termination, your data will be handled as described in our{" "}
              <Link href="/privacy" className="text-brand-600 underline hover:text-brand-700">
                Privacy Policy
              </Link>.
            </p>

            <h2>12. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we&apos;ll update the
              &quot;Last updated&quot; date. If changes are material, we&apos;ll notify you by
              email. Continued use of the service after changes take effect constitutes acceptance
              of the updated Terms.
            </p>

            <h2>13. Governing Law and Disputes</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware, without regard to its
              conflict of law principles. Any dispute arising out of or related to these Terms
              shall be resolved by binding arbitration under the rules of the American Arbitration
              Association, except that either party may seek injunctive relief in a court of
              competent jurisdiction.
            </p>

            <h2>14. Miscellaneous</h2>
            <p>
              These Terms, together with our{" "}
              <Link href="/privacy" className="text-brand-600 underline hover:text-brand-700">
                Privacy Policy
              </Link>, constitute the entire agreement between you and Daysight regarding the
              service. If any provision is found to be unenforceable, the remaining provisions
              remain in full force.
            </p>

            <h2>15. Contact Us</h2>
            <p>Questions about these Terms?</p>
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
