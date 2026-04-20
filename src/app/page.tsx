import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          <span className="text-brand-600">Daysight</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Never miss a birthday again. Get timely reminders with curated gift
          suggestions — so you always know what to do about it.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth"
            className="bg-brand-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand-700 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/about"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </div>
    </main>
  );
}
