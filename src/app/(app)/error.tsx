"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">:(</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 mb-6">
          An unexpected error occurred. Your data is safe — try refreshing or
          click below to retry.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
