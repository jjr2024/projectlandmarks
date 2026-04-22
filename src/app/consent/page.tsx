"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConsentPage() {
  const router = useRouter();
  const supabase = createClient();

  const [consentTerms, setConsentTerms] = useState(false);
  const [consentEmails, setConsentEmails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!consentTerms || !consentEmails) {
      setError("You must consent to both before continuing.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          consent_terms: true,
          consent_emails: true,
          consent_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to save consent. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Before you continue</h1>
        <p className="text-gray-600 mb-6">
          We need your consent to use Daysight and receive reminder emails.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Terms consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentTerms}
                onChange={(e) => setConsentTerms(e.target.checked)}
                className="w-5 h-5 text-brand-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-brand-500 mt-0.5"
              />
              <span className="text-sm text-gray-700">
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 underline"
                >
                  Terms of Service
                </a>
                {" "}and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:text-brand-700 underline"
                >
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Affiliate email consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentEmails}
                onChange={(e) => setConsentEmails(e.target.checked)}
                className="w-5 h-5 text-brand-600 bg-white border-gray-300 rounded focus:ring-2 focus:ring-brand-500 mt-0.5"
              />
              <span className="text-sm text-gray-700">
                I agree to receive reminder emails from daysight.xyz that include affiliate links from Amazon.com
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !consentTerms || !consentEmails}
            className="w-full py-2.5 px-4 rounded-lg font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
