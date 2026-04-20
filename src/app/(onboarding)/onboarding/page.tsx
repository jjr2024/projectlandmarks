"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
];

const GIFT_OPTIONS = [
  { value: "flowers", label: "Flowers", emoji: "\uD83C\uDF37" },
  { value: "wine", label: "Wine", emoji: "\uD83C\uDF77" },
  { value: "treats", label: "Treats", emoji: "\uD83C\uDF6B" },
  { value: "gift_card", label: "Gift Card", emoji: "\uD83C\uDF81" },
  { value: "experiences", label: "Experience", emoji: "\uD83C\uDFAD" },
  { value: "donation", label: "Donation", emoji: "\u2764\uFE0F" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2024, i, 1).toLocaleDateString("en-US", { month: "long" }),
}));

const DAYS_IN_MONTH: Record<number, number> = {
  1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

const TOTAL_STEPS = 4;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 2: Contact + event
  const [contact, setContact] = useState({
    first_name: "",
    last_name: "",
    relationship: "friend",
  });
  const [eventType, setEventType] = useState("birthday");
  const [eventLabel, setEventLabel] = useState("");
  const [eventMonth, setEventMonth] = useState(0);
  const [eventDay, setEventDay] = useState(0);
  const [highImportance, setHighImportance] = useState(false);
  const [suppressGifts, setSuppressGifts] = useState(false);

  // Step 3: Gift prefs
  const [giftCategories, setGiftCategories] = useState<string[]>([]);
  const [giftOther, setGiftOther] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      setFirstName(profile?.display_name?.split(" ")[0] || "there");
    }
    load();
  }, []);

  const maxDays = DAYS_IN_MONTH[eventMonth] || 31;

  const canProceedStep2 =
    contact.first_name.trim() &&
    eventMonth > 0 &&
    eventDay > 0 &&
    (eventType !== "custom" || eventLabel.trim());

  const toggleGift = (val: string) => {
    setGiftCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const handleSaveAndFinish = async () => {
    setSaving(true);

    // Create contact
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        first_name: contact.first_name.trim(),
        last_name: contact.last_name.trim(),
        relationship: contact.relationship,
        gift_categories: giftCategories,
        gift_other: giftOther.trim(),
      })
      .select()
      .single();

    if (newContact) {
      // Create event
      await supabase.from("events").insert({
        contact_id: newContact.id,
        user_id: userId,
        event_type: eventType,
        event_label: eventType === "custom" ? eventLabel.trim() : "",
        month: eventMonth,
        day: Math.min(eventDay, maxDays),
        high_importance: highImportance,
        suppress_gifts: suppressGifts,
      });
    }

    setSaving(false);
    setStep(4);
  };

  const progressWidth = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with progress */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-brand-600 text-lg">Daysight</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Step {step} of {TOTAL_STEPS}
            </span>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Skip setup &rarr;
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-gray-100">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-xl mx-auto">
          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div>
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="text-3xl">&#128075;</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">
                  Welcome, <span className="text-brand-600">{firstName}</span>!
                </h1>
                <p className="text-gray-500 text-lg max-w-sm mx-auto">
                  Let&apos;s get you set up in about 2 minutes. We&apos;ll start with the person you
                  most want to remember.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50 mb-8">
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0 text-lg">
                    &#128100;
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Add a contact and their dates
                    </p>
                    <p className="text-gray-500 text-sm">
                      Name, birthday, anniversary — all in one go
                    </p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">~1 min</span>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0 text-lg">
                    &#127873;
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      Pick their gift preferences
                    </p>
                    <p className="text-gray-500 text-sm">
                      So your reminders include the right ideas
                    </p>
                  </div>
                  <span className="ml-auto text-xs text-gray-400">~30 sec</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center mb-4">
                Your data stays private — we never contact the people you add.
              </p>

              <button
                onClick={() => setStep(2)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
              >
                Let&apos;s get started &rarr;
              </button>
            </div>
          )}

          {/* ── Step 2: Contact + Event ── */}
          {step === 2 && (
            <div>
              <div className="mb-6">
                <p className="text-sm text-brand-600 font-semibold uppercase tracking-wide mb-2">
                  Step 1
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Who do you want to remember?
                </h2>
                <p className="text-gray-500">
                  Add their name, relationship, and the date that matters.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={contact.first_name}
                      onChange={(e) => setContact({ ...contact, first_name: e.target.value })}
                      placeholder="Sarah"
                      autoFocus
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input
                      type="text"
                      value={contact.last_name}
                      onChange={(e) => setContact({ ...contact, last_name: e.target.value })}
                      placeholder="Chen"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {RELATIONSHIPS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setContact({ ...contact, relationship: r.value })}
                        className={`border-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                          contact.relationship === r.value
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-gray-200 text-gray-500 hover:border-brand-300"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Event type */}
                <div className="border-t border-gray-100 pt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What date matters?
                  </label>
                  <div className="flex gap-2 mb-4">
                    {["birthday", "anniversary", "custom"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEventType(t)}
                        className={`border-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                          eventType === t
                            ? "border-brand-600 bg-brand-50 text-brand-700"
                            : "border-gray-200 text-gray-500 hover:border-brand-300"
                        }`}
                      >
                        {t === "custom" ? "Other" : t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>

                  {eventType === "custom" && (
                    <div className="mb-4">
                      <input
                        type="text"
                        value={eventLabel}
                        onChange={(e) => setEventLabel(e.target.value)}
                        placeholder="Event name (e.g. Graduation)"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Month + Day */}
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={eventMonth}
                      onChange={(e) => {
                        const m = parseInt(e.target.value);
                        setEventMonth(m);
                        setEventDay((prev) => Math.min(prev, DAYS_IN_MONTH[m] || 31));
                      }}
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value={0}>Month</option>
                      {MONTHS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={eventDay}
                      onChange={(e) => setEventDay(parseInt(e.target.value))}
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    >
                      <option value={0}>Day</option>
                      {Array.from({ length: maxDays }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* High importance + Suppress gifts row */}
                  <div className="flex items-center justify-between mt-4">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={highImportance}
                        onChange={(e) => setHighImportance(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-300 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-gray-600">High importance</span>
                      <span className="relative group">
                        <svg className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 leading-relaxed z-50 shadow-lg">
                          Adds an extra reminder 21 days before so you have more time to plan.
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setSuppressGifts(!suppressGifts)}
                      className={`flex items-center gap-1.5 text-xs transition-colors rounded-full px-2.5 py-1 ${
                        suppressGifts ? "bg-gray-200 text-gray-600" : "text-gray-400 hover:text-gray-500"
                      }`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      Skip gifts
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next &rarr;
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Gift preferences ── */}
          {step === 3 && (
            <div>
              <div className="mb-6">
                <p className="text-sm text-brand-600 font-semibold uppercase tracking-wide mb-2">
                  Step 2
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What does {contact.first_name || "this person"} like?
                </h2>
                <p className="text-gray-500">
                  Pick any that apply — we&apos;ll use these to suggest gifts in your reminders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {GIFT_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGift(g.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                      giftCategories.includes(g.value)
                        ? "border-brand-600 bg-brand-50"
                        : "border-gray-200 hover:border-brand-300"
                    }`}
                  >
                    <span className="text-xl">{g.emoji}</span>
                    <span
                      className={`text-sm font-medium ${
                        giftCategories.includes(g.value) ? "text-brand-700" : "text-gray-700"
                      }`}
                    >
                      {g.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anything else they like?
                </label>
                <input
                  type="text"
                  value={giftOther}
                  onChange={(e) => setGiftOther(e.target.value)}
                  placeholder="e.g. Board games, puzzles, cooking"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  &larr; Back
                </button>
                <button
                  onClick={handleSaveAndFinish}
                  disabled={saving}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : "Save & finish"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">&#10003;</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">You&apos;re all set!</h2>
              <p className="text-gray-500 text-lg max-w-sm mx-auto mb-8">
                We&apos;ll send you a reminder before {contact.first_name || "their"} big day with
                curated gift ideas. No more last-minute scrambles.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-4 rounded-xl text-lg transition-colors"
                >
                  Go to dashboard
                </button>
                <button
                  onClick={() => router.push("/contacts")}
                  className="w-full border border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Add more contacts
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
