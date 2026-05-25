"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { GiftCategoryIcon } from "@/components/gift-icons";
import { friendlyError } from "@/lib/errors";
import { GIFT_OPTIONS } from "@/lib/constants";

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
];

const GENDER_OPTIONS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
  { value: "N/A", label: "N/A" },
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

function OnboardingContent() {
  // Always start at step 1 — URL-based step initialization was removed because
  // it allowed users to jump to step 3/4 via ?step= with all form state blank,
  // causing garbage contact inserts or RLS errors on save. The onboarding flow
  // is short enough that restarting from step 1 is fine. See bug sweep C1.
  const [step, setStepRaw] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [userId, setUserId] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const savedRef = useRef(false);
  const router = useRouter();

  // Step 2: Contact + events
  const [contact, setContact] = useState({
    first_name: "",
    last_name: "",
    relationship: "friend",
    gender: "",
    notes: "",
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
  const [advancedOpenIndexes, setAdvancedOpenIndexes] = useState<Set<number>>(new Set());

  // Step 3: Gift prefs
  const [giftCategories, setGiftCategories] = useState<string[]>([]);
  const [giftOther, setGiftOther] = useState("");
  const [budgetTier, setBudgetTier] = useState("");
  const [hasPets, setHasPets] = useState(false);

  const setStep = useCallback((newStep: number) => {
    setStepRaw(newStep);
    window.scrollTo({ top: 0 });
  }, []);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        // No session — redirect to auth instead of rendering with empty state
        router.push("/auth");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      setFirstName(profile?.display_name?.split(" ")[0] || "there");
      setProfileLoaded(true);
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
        (e.event_type !== "custom" || e.event_label.trim()) &&
        (!e.one_time || e.event_year)
    );

  const toggleGift = (val: string) => {
    setGiftCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const [saveError, setSaveError] = useState("");

  const handleSaveAndFinish = async () => {
    // Guard against double-submission (e.g. browser Back from step 4)
    if (savedRef.current || saving) return;
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
          gender: contact.gender || null,
          gift_categories: giftCategories,
          gift_other: giftOther.trim(),
          has_pets: hasPets,
          budget_tier: budgetTier || null,
          notes: contact.notes.trim(),
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
          year_started: e.year_started || null,
          one_time: e.one_time || false,
          event_year: e.one_time && e.event_year ? e.event_year : null,
        }));

        const { error: eventError } = await supabase
          .from("events")
          .insert(eventsToInsert);
        if (eventError) throw eventError;
      }

      savedRef.current = true;
      setStep(4);
    } catch (err: any) {
      setSaveError(friendlyError(err, "save your contact"));
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

  const toggleAdvanced = (index: number) => {
    setAdvancedOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateEvent = (index: number, updates: Partial<EventData>) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], ...updates };
    setEvents(newEvents);
  };

  const progressWidth = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  // Wait for profile to load before rendering the flow (fixes C3: "Welcome, !" flash)
  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-6 w-6 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with progress */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-10">
        <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-brand-600 text-lg">Daysight</span>
          <span className="text-sm text-gray-400">
            Step {step} of {TOTAL_STEPS}
          </span>
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
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
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
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="13" rx="2" />
                      <path d="M12 8V3" />
                      <path d="M12 8H7.5a2.5 2.5 0 0 1 0-5C9.5 3 12 8 12 8z" />
                      <path d="M12 8h4.5a2.5 2.5 0 0 0 0-5C14.5 3 12 8 12 8z" />
                      <path d="M12 8v13" />
                      <path d="M3 14h18" />
                    </svg>
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
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                    <input
                      type="text"
                      value={contact.last_name}
                      onChange={(e) => setContact({ ...contact, last_name: e.target.value })}
                      placeholder="Chen"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <select
                    value={contact.gender}
                    onChange={(e) => setContact({ ...contact, gender: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="">Not specified</option>
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={contact.notes}
                    onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                    rows={2}
                    placeholder="Anything helpful for gift picking..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
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
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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

                          {/* High importance + Skip gifts + Remove row */}
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2.5">
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
                              </label>
                              <span className="relative group" onClick={(e) => e.preventDefault()}>
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
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateEvent(idx, { suppress_gifts: !event.suppress_gifts })}
                                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                  event.suppress_gifts
                                    ? "bg-gray-200 text-gray-600"
                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                                }`}
                              >
                                Skip gifts
                              </button>
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
                          </div>

                          {/* Other options (collapsed by default) */}
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => toggleAdvanced(idx)}
                              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${advancedOpenIndexes.has(idx) ? "rotate-90" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              Other options
                            </button>

                            {advancedOpenIndexes.has(idx) && (
                              <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
                                {/* Year started */}
                                <div>
                                  <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                    Year started <span className="font-normal normal-case text-gray-400">(optional)</span>
                                  </label>
                                  <input
                                    type="number"
                                    value={event.year_started || ""}
                                    onChange={(e) => updateEvent(idx, { year_started: e.target.value ? parseInt(e.target.value) : undefined })}
                                    placeholder="e.g. 1990"
                                    min="1900"
                                    max="2100"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                  />
                                </div>

                                {/* One-time event */}
                                <div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={event.one_time || false}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        updateEvent(idx, {
                                          one_time: checked,
                                          event_year: checked && !event.event_year ? new Date().getFullYear() : checked ? event.event_year : undefined,
                                        });
                                        // Keep collapsible open so the required year field stays visible
                                        if (checked) {
                                          setAdvancedOpenIndexes((prev) => new Set(prev).add(idx));
                                        }
                                      }}
                                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-600">One-time event (don&apos;t repeat annually)</span>
                                  </label>
                                </div>

                                {/* Event year (required when one-time) */}
                                {event.one_time && (
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                                      Event year <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                      type="number"
                                      value={event.event_year || ""}
                                      onChange={(e) => updateEvent(idx, { event_year: e.target.value ? parseInt(e.target.value) : undefined })}
                                      placeholder={String(new Date().getFullYear())}
                                      min={new Date().getFullYear()}
                                      max="2100"
                                      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                                        !event.event_year ? "border-red-300" : "border-gray-200"
                                      }`}
                                    />
                                    {!event.event_year && (
                                      <p className="text-xs text-red-500 mt-1">Year is required for one-time events</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
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

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anything else they like?
                </label>
                <input
                  type="text"
                  value={giftOther}
                  onChange={(e) => setGiftOther(e.target.value)}
                  placeholder="e.g. Board games, puzzles, cooking"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gift budget <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={budgetTier}
                  onChange={(e) => setBudgetTier(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                >
                  <option value="">Any budget</option>
                  <option value="low">Under $50</option>
                  <option value="mid">$50–$100</option>
                  <option value="high">Over $100</option>
                </select>
              </div>

              {/* Has pets toggle */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">Has pet(s) (include pet gift ideas)</span>
                </label>
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

export default function OnboardingPage() {
  return <OnboardingContent />;
}
