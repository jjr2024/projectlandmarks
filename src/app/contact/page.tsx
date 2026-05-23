import MarketingNav from "@/components/marketing-nav";
import MarketingFooter from "@/components/marketing-footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Daysight",
  description: "Get in touch with the Daysight team.",
};

export default function ContactPage() {
  return (
    <>
      <MarketingNav />
      <main className="pt-28 pb-24 px-6">
        <div className="max-w-xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3">Contact Us</h1>
          <p className="text-gray-500 leading-relaxed mb-8">
            Have a question, suggestion, or just want to say hi? We&apos;d love to hear from you.
          </p>
          <p className="text-gray-700">
            Reach us at{" "}
            <a
              href="mailto:info@daysight.xyz"
              className="text-brand-600 underline hover:text-brand-700 font-medium"
            >
              info@daysight.xyz
            </a>
          </p>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
