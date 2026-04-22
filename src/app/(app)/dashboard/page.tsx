"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  formatDate,
  daysUntilLabel,
  urgencyClass,
  eventTypeLabel,
  getInitials,
  daysUntilEvent,
} from "@/lib/utils";
import { selectGiftsScored } from "@/lib/gift-engine";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  high_importance: boolean;
}

interface Event {
  id: string;
  contact_id: string;
  event_type: string;
  event_label: string;
  month: number;
  day: number;
  year_started: number | null;
  one_time: boolean;
  event_year: number | null;
  high_importance: boolean;
  suppress_gifts: boolean;
}

interface UpcomingReminder {
  event: Event;
  contact: Contact;
  daysUntil: number;
  nextDate: string;
}

interface GiftItem {
  id: string;
  name: string;
  partner: string;
  price_tier: string;
  affiliate_url: string;
}

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(false);
  const [filterDays, setFilterDays] = useState<30 | 90>(30);
  const [previewReminder, setPreviewReminder] = useState<UpcomingReminder | null>(null);
  const [previewGifts, setPreviewGifts] = useState<GiftItem[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Redirect new users (account created in last hour, zero contacts) to onboarding
      const createdAt = user.created_at ? new Date(user.created_at) : null;
      const isNewUser =
        createdAt && Date.now() - createdAt.getTime() < 60 * 60 * 1000;

      if (isNewUser) {
        const { count } = await supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (count === 0) {
          router.push("/onboarding");
          return;
        }
      }

      const [contactsRes, eventsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("*")
          .eq("user_id", user.id)
          .is("deleted_at", null),
        supabase.from("events").select("*").eq("user_id", user.id),
      ]);

      setContacts(contactsRes.data || []);
      setEvents(eventsRes.data || []);
      setLoading(false);
      setLoadingError(false);
    }

    load();

    // Set a timeout for loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoadingError(true);
        setLoading(false);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, []);

  // Compute upcoming reminders
  const upcoming: UpcomingReminder[] = events
    .map((evt) => {
      const contact = contacts.find((c) => c.id === evt.contact_id);
      if (!contact) return null;

      const days = daysUntilEvent(evt.month, evt.day, evt.one_time, evt.event_year);
      if (days === null || days > 60) return null;

      const thisYear = new Date().getFullYear();
      const yr = evt.one_time ? evt.event_year || thisYear : thisYear;
      let nextDate = new Date(yr, evt.month - 1, evt.day);
      if (!evt.one_time && nextDate < new Date()) {
        nextDate = new Date(thisYear + 1, evt.month - 1, evt.day);
      }

      return {
        event: evt,
        contact,
        daysUntil: days,
        nextDate: nextDate.toISOString().split("T")[0],
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntil - b!.daysUntil) as UpcomingReminder[];

  const urgentCount = upcoming.filter((u) => u.daysUntil <= 3).length;

  // Count events this calendar month
  const currentMonth = new Date().getMonth() + 1;
  const thisMonthCount = events.filter((e) => e.month === currentMonth).length;

  const URGENCY_STYLES = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    soon: "bg-orange-100 text-orange-800 border-orange-200",
    upcoming: "bg-green-100 text-green-800 border-green-200",
  };

  // Handle preview modal
  const openPreview = async (reminder: UpcomingReminder) => {
    setPreviewReminder(reminder);
    setPreviewLoading(true);

    try {
      const gifts = await selectGiftsScored(
        supabase,
        reminder.contact,
        reminder.event,
        reminder.daysUntil,
        new Date().getFullYear(),
        3
      );
      setPreviewGifts(gifts);
    } catch (err) {
      console.error("Failed to load gifts for preview:", err);
      setPreviewGifts([]);
    }

    setPreviewLoading(false);
  };

  const closePreview = () => {
    setPreviewReminder(null);
    setPreviewGifts([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading your dashboard...</p>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">
            Failed to load dashboard. The request timed out.
          </p>
          <button
            onClick={() => {
              setLoadingError(false);
              setLoading(true);
              window.location.reload();
            }}
            className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Your upcoming dates at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Contacts</p>
          <p className="text-3xl font-bold text-gray-900">{contacts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Events tracked</p>
          <p className="text-3xl font-bold text-gray-900">{events.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">Urgent (≤ 3 days)</p>
          <p className="text-3xl font-bold text-red-600">
            {urgentCount}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm text-gray-500">This month</p>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{thisMonthCount}</p>
        </div>
      </div>

      {/* Privacy note */}
      <p className="text-xs text-gray-400 mb-4">
        Your data is yours — export or delete anytime in Settings.
      </p>

      {/* Upcoming reminders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterDays(30)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterDays === 30
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Next 30 days
              </button>
              <button
                onClick={() => setFilterDays(90)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterDays === 90
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Next 90 days
              </button>
            </div>
          </div>
        </div>

        {upcoming.filter((u) => u.daysUntil <= filterDays).length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-gray-400 mb-4">No upcoming events in the next 60 days.</p>
            <Link
              href="/contacts"
              className="inline-block bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Add a contact
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.filter((u) => u.daysUntil <= filterDays).map((item) => {
              const urg = urgencyClass(item.daysUntil);
              return (
                <li key={item.event.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                      {getInitials(item.contact.first_name, item.contact.last_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/contacts/${item.contact.id}`}
                        className="font-medium text-gray-900 hover:text-brand-600 transition-colors"
                      >
                        {item.contact.first_name} {item.contact.last_name}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {eventTypeLabel(item.event.event_type)}
                        {item.event.event_type === "custom" && item.event.event_label
                          ? ` — ${item.event.event_label}`
                          : ""}
                        {" · "}
                        {formatDate(item.event.month, item.event.day)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPreview(item)}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Preview
                      </button>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${URGENCY_STYLES[urg]}`}
                      >
                        {daysUntilLabel(item.daysUntil)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Email preview modal */}
      {previewReminder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Email preview"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            {/* Close button */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Email Preview</h2>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Email preview content */}
            <div className="p-6">
              {/* Event info */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
                    {getInitials(
                      previewReminder.contact.first_name,
                      previewReminder.contact.last_name
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {previewReminder.contact.first_name}{" "}
                      {previewReminder.contact.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {eventTypeLabel(previewReminder.event.event_type)}
                      {previewReminder.event.event_type === "custom" &&
                        previewReminder.event.event_label
                        ? ` — ${previewReminder.event.event_label}`
                        : ""}{" "}
                      on {formatDate(previewReminder.event.month, previewReminder.event.day)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulated email */}
              <div className="bg-gradient-to-r from-[#d05a32] to-[#ad4628] rounded-t-xl p-6 text-white mb-0">
                <div className="inline-flex items-center gap-2 mb-3 text-sm font-semibold">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-white/20 rounded-md text-sm">
                    ★
                  </span>
                  <span>Daysight</span>
                </div>
                <h3 className="text-lg font-bold leading-tight">
                  {previewReminder.daysUntil === 1
                    ? `${previewReminder.contact.first_name}'s ${eventTypeLabel(previewReminder.event.event_type).toLowerCase()} is tomorrow`
                    : `${previewReminder.contact.first_name}'s ${eventTypeLabel(previewReminder.event.event_type).toLowerCase()} is in ${previewReminder.daysUntil} days`}
                </h3>
              </div>

              <div className="bg-white border border-t-0 border-gray-200 rounded-b-xl p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Hi there,
                </p>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  {previewReminder.daysUntil === 1
                    ? `Last chance — ${previewReminder.contact.first_name}'s ${eventTypeLabel(previewReminder.event.event_type).toLowerCase()} is tomorrow, ${formatDate(
                        previewReminder.event.month,
                        previewReminder.event.day
                      )}. We've put together your best same-day options below.`
                    : `${previewReminder.contact.first_name}'s ${eventTypeLabel(previewReminder.event.event_type).toLowerCase()} is coming up on ${formatDate(
                        previewReminder.event.month,
                        previewReminder.event.day
                      )} — ${previewReminder.daysUntil} days from now. Here are a few gift ideas they'd love, ready to order in one click.`}
                </p>

                {/* Gifts section */}
                {!previewReminder.event.suppress_gifts && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Gift suggestions
                    </h4>
                    {previewLoading ? (
                      <p className="text-sm text-gray-400">Loading gifts...</p>
                    ) : previewGifts.length > 0 ? (
                      <div className="space-y-2">
                        {previewGifts.map((gift) => (
                          <div
                            key={gift.id}
                            className="border border-gray-200 rounded-lg p-3"
                          >
                            <p className="font-medium text-gray-900 text-sm">
                              {gift.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {gift.partner} • {gift.price_tier}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No gifts available in selected categories.
                      </p>
                    )}
                  </div>
                )}

                {previewReminder.event.suppress_gifts && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <p className="text-sm text-blue-900">
                      This is a sensitive event. Email will not include gift suggestions.
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 text-center">
                  Sent by Daysight • Never miss an important date
                </p>
              </div>
            </div>

            {/* Close button */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={closePreview}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
