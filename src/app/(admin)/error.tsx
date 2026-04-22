"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">:(</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Admin panel error
        </h2>
        <p className="text-gray-500 mb-6">
          Something went wrong loading this page. This has been logged. Try
          refreshing or click below to retry.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/admin"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Admin dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
