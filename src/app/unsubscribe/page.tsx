"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "confirm" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!uid || !token) {
      setStatus("error");
      setErrorMsg("Invalid unsubscribe link. Please use the link from your email.");
      return;
    }
    setStatus("confirm");
  }, [uid, token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to unsubscribe. Please try again.");
      }

      setStatus("done");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">Processing...</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-green-50 border border-green-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-green-800 mb-2">You&apos;ve been unsubscribed</h2>
          <p className="text-green-700 text-sm">
            You won&apos;t receive any more emails from Daysight. If you change your mind,
            you can re-enable emails in your account settings.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 items-center">
          <Link href="/settings" className="text-brand-600 hover:underline text-sm">
            Go to settings
          </Link>
          <Link href="/" className="text-gray-400 hover:underline text-sm">
            Back to Daysight
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full max-w-md text-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-700 text-sm">{errorMsg}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2 items-center">
          <Link href="/settings" className="text-brand-600 hover:underline text-sm">
            Manage email preferences in settings
          </Link>
          <Link href="/" className="text-gray-400 hover:underline text-sm">
            Back to Daysight
          </Link>
        </div>
      </div>
    );
  }

  // status === "confirm"
  return (
    <div className="w-full max-w-md">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribe from Daysight?</h1>
        <p className="text-gray-500 text-sm mb-6">
          This will turn off all reminder emails, monthly digests, and re-engagement emails.
          You can re-enable them anytime in your account settings.
        </p>
        <button
          onClick={handleUnsubscribe}
          className="w-full bg-red-600 text-white py-2.5 rounded-lg font-semibold hover:bg-red-700 transition-colors mb-3"
        >
          Yes, unsubscribe me
        </button>
        <Link
          href="/"
          className="block text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Never mind, keep my emails
        </Link>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
        <UnsubscribeForm />
      </Suspense>
    </main>
  );
}
