"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GiftCategoryIcon } from "@/components/gift-icons";

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
];

const GIFT_OPTIONS = [
  { value: "flowers", label: "Flowers", description: "Bouquets & arrangements" },
  { value: "wine", label: "Wine", description: "Bottles & subscriptions" },
  { value: "treats", label: "Treats", description: "Chocolates & sweets" },
  { value: "gift_card", label: "Gift Card", description: "Always a safe bet" },
  { value: "experiences", label: "Experience", description: "Concerts, dining & more" },
  { value: "donation", label: "Donation", description: "Charitable giving" },
  { value: "home", label: "Home", description: "Decor & lifestyle" },
  { value: "accessories", label: "Accessories", description: "Fashion & gadgets" },
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

interface EventData {
  event_type: string;
  event_label: string;
  month: number;
  day: number;
  year_started?: number;
  one_time?: boolean;
  event_year?: number;
  high_importance: boolean;
  suppress_gifts: boolean;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  // Step 2: Contact + events
  const [contact, setContact] = useState({
    first_name: "",
    last_name: "",
    relationship: "friend",
  });
  const [events, setEvents] = useState<EventData[]>([
    {
      event_type: "birthday",
      event_label: "",
      month: 0,
      day: 0,
      high_importance: false,
      suppress_gifts: false,
    },
  ]);
  const [expandedEventIndex, setExpandedEventIndex] = useState(0);

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

  const currentEvent = events[expandedEventIndex] || events[0];
  const maxDays = DAYS_IN_MONTH[currentEvent.month] || 31;

  const canProceedStep2 =
    contact.first_name.trim() &&
    events.length > 0 &&
    events.every(
      (e) =>
        e.month > 0 &&
        e.day > 0 &&
        (e.event_type !== "custom" || e.event_label.trim())
    );

  const toggleGift = (val: string) => {
    setGiftCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const [saveError, setSaveError] = useState("");

  const handleSaveAndFinish = async () => {
    setSaving(true);
    setSaveError("");

    try {
      // Create contact
      const { data: newContact, error: contactError } = await supabase
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

      if (contactError) throw contactError;

      if (newContact) {
        // Create all events
        const eventsToInsert = events.map((e) => ({
          contact_id: newContact.id,
          user_id: userId,
          event_type: e.event_type,
          event_label: e.event_type === "custom" ? e.event_label.trim() : "",
          month: e.month,
          day: Math.min(e.day, DAYS_IN_MONTH[e.month] || 31),
          high_importance: e.high_importance,
          suppress_gifts: e.suppress_gifts,
        }));

        const { error: eventError } = await supabase
          .from("events")
          .insert(eventsToInsert);
        if (eventError) throw eventError;
      }

      setStep(4);
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvent = () => {
    setEvents([
      ...events,
      {
        event_type: "birthday",
        event_label: "",
        month: 0,
        day: 0,
        high_importance: false,
        suppress_gifts: false,
      },
    ]);
    setExpandedEventIndex(events.length);
  };

  const handleRemoveEvent = (index: number) => {
    const newEvents = events.filter((_, i) => i !== index);
    setEvents(newEvents);
    if (expandedEventIndex >= newEvents.length) {
      setExpandedEventIndex(Math.max(0, newEvents.length - 1));
    }
  };

  const updateEvent = (index: number, updates: Partial<EventData>) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], ...updates };
    setEvents(newEvents);
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
                onClick={() => { setStep(2); setSaveError(""); }}
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
                  Step 2
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

                {/* Events */}
                <div className="border-t border-gray-100 pt-5">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    What dates matter?
                  </label>

                  {events.map((event, idx) => (
                    <div
                      key={idx}
                      className={`mb-4 border rounded-lg overflow-hidden transition-all ${
                        expandedEventIndex === idx
                          ? "border-brand-300 bg-brand-50"
                          : "border-gray-200 hover:border-brand-300"
                      }`}
                    >
                      {/* Header (collapsible) */}
                      <button
                        type="button"
                        onClick={() => setExpandedEventIndex(idx)}
                        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xs font-semibold text-gray-400">
                            Date {idx + 1}
                          </span>
                          <span className="text-sm text-gray-600">
                            {event.month > 0 && event.day > 0
                              ? `${MONTHS.find((m) => m.value === event.month)?.label || ""} ${event.day}${
                                  event.event_type === "custom" ? ` · ${event.event_label}` : ""
                                }`
                              : "Not set"}
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedEventIndex === idx ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </button>

                      {/* Expanded content */}
                      {expandedEventIndex === idx && (
                        <div className="border-t border-gray-200 px-4 py-4 space-y-3 bg-white">
                          {/* Event type */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Type
                            </label>
                            <div className="flex gap-2">
                              {["birthday", "anniversary", "custom"].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() =>
                                    updateEvent(idx, {
                                      event_type: t,
                                      event_label: t === "custom" ? event.event_label : "",
                                    })
                                  }
                                  className={`border-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                                    event.event_type === t
                                      ? "border-brand-600 bg-brand-50 text-brand-700"
                                      : "border-gray-200 text-gray-500 hover:border-brand-300"
                                  }`}
                                >
                                  {t === "custom" ? "Other" : t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Custom event label */}
                          {event.event_type === "custom" && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                Event name
                              </label>
                              <input
                                type="text"
                                value={event.event_label}
                                onChange={(e) => updateEvent(idx, { event_label: e.target.value })}
                                placeholder="e.g. Graduation"
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                              />
                            </div>
                          )}

                          {/* Month + Day */}
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                              Date
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={event.month}
                                onChange={(e) => {
                                  const m = parseInt(e.target.value);
                                  updateEvent(idx, {
                                    month: m,
                                    day: Math.min(event.day, DAYS_IN_MONTH[m] || 31),
                                  });
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
                                value={event.day}
                                onChange={(e) => updateEvent(idx, { day: parseInt(e.target.value) })}
                                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                              >
                                <option value={0}>Day</option>
                                {Array.from(
                                  { length: DAYS_IN_MONTH[event.month] || 31 },
                                  (_, i) => (
                                    <option key={i + 1} value={i + 1}>
                                      {i + 1}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>

                          {/* High importance + Suppress gifts row */}
                          <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={event.high_importance}
                                onChange={(e) =>
                                  updateEvent(idx, { high_importance: e.target.checked })
                                }
                                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-300 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-gray-600">
                                High importance
                              </span>
                              <span className="relative group">
                                <svg
                                  className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 leading-relaxed z-50 shadow-lg">
                                  Adds an extra reminder 21 days before so you have more time to
                                  plan.
                                </span>
                              </span>
                            </label>
                            {events.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveEvent(idx)}
                                className="text-xs text-red-500 hover:text-red-600 font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Suppress gifts */}
                          <button
                            type="button"
                            onClick={() => updateEvent(idx, { suppress_gifts: !event.suppress_gifts })}
                            className={`w-full flex items-center gap-1.5 text-xs transition-colors rounded-lg px-3 py-2 ${
                              event.suppress_gifts
                                ? "bg-gray-200 text-gray-600"
                                : "text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                            }`}
                          >
                            <svg
                              className="w-3 h-3"
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
                            Skip gifts for this date
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add another date button */}
                  <button
                    type="button"
                    onClick={handleAddEvent}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-brand-400 rounded-lg py-3 px-4 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-brand-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add another date
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setStep(1); setSaveError(""); }}
                  className="px-5 py-3 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  &larr; Back
                </button>
                <button
                  onClick={() => { setStep(3); setSaveError(""); }}
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
                  Step 3
                </p>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  What does {contact.first_name || "this person"} like?
                </h2>
                <p className="text-gray-500">
                  Pick any that apply — we&apos;ll use these to suggest gifts in your reminders.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {GIFT_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGift(g.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-center ${
                      giftCategories.includes(g.value)
                        ? "border-brand-600 bg-brand-50"
                        : "border-gray-200 hover:border-brand-300"
                    }`}
                  >
                    <div
                      className={`transition-colors ${
                        giftCategories.includes(g.value) ? "text-brand-600" : "text-gray-400"
                      }`}
                    >
                      <GiftCategoryIcon
                        category={g.value}
                        className="w-6 h-6"
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          giftCategories.includes(g.value) ? "text-brand-700" : "text-gray-700"
                        }`}
                      >
                        {g.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Shortcut button */}
              <button
                type="button"
                onClick={() => {
                  setGiftCategories(["gift_card"]);
                  handleSaveAndFinish();
                }}
                disabled={saving}
                className="w-full border-2 border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-700 font-medium py-3 rounded-xl text-sm transition-colors mb-6 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Not sure? Default to gift cards
              </button>

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

              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                  {saveError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep(2); setSaveError(""); }}
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
