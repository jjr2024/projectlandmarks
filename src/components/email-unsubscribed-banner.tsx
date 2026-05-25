import Link from "next/link";

export default function EmailUnsubscribedBanner() {
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-4 mb-6 rounded-lg">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <svg
          className="w-5 h-5 text-red-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
        <p className="text-sm text-red-800">
          <span className="font-semibold">Reminder emails are off.</span>{" "}
          You&apos;ve unsubscribed from emails — Daysight can&apos;t send you reminders until you re-enable them in{" "}
          <Link
            href="/settings"
            className="underline hover:text-red-900 font-medium"
          >
            Settings
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
