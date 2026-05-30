import Link from "next/link";
import { isAllowedOtpType, validateNext } from "@/lib/auth-callback";

/**
 * Interstitial email-confirmation page (token_hash flow — Option A).
 *
 * The confirmation email links HERE (a GET page) rather than verifying the
 * token directly. We deliberately do NOT call verifyOtp on page load: the
 * `token_hash` is single-use, and email security scanners / mail-app link
 * prefetchers issue GET requests that would otherwise consume the token before
 * the human clicks (the exact "expired" failure seen in production). A scanner
 * that fetches this page only renders HTML — the token is untouched until a
 * real person clicks the button, which POSTs to /auth/confirm/verify.
 *
 * Because verifyOtp runs server-side with no PKCE code_verifier, the link works
 * and logs the user in on ANY device — fixing the cross-device dead-end.
 */
export default function ConfirmPage({
  searchParams,
}: {
  searchParams: { token_hash?: string; type?: string; next?: string };
}) {
  const tokenHash = searchParams.token_hash ?? "";
  const type = searchParams.type ?? "";
  const next = validateNext(searchParams.next);

  const valid = !!tokenHash && isAllowedOtpType(type);

  if (!valid) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-amber-800 mb-2">Link not valid</h2>
            <p className="text-amber-700 mb-4">
              This confirmation link is missing information or has already been used.
              If you&apos;ve already confirmed your email, just sign in — otherwise
              request a new link.
            </p>
            <Link
              href="/auth?error=link_expired"
              className="inline-block bg-brand-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-2">
          Confirm your <span className="text-brand-600">Daysight</span> email
        </h1>
        <p className="text-gray-500 mb-8">
          One last step — confirm your email address to activate your account.
        </p>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <form method="POST" action="/auth/confirm/verify">
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
            >
              Confirm my email
            </button>
          </form>
        </div>

        <div className="mt-6">
          <Link href="/auth" className="text-sm text-brand-600 hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
