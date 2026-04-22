"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getInitials,
  relationshipLabel,
  giftLabel,
  budgetLabel,
  formatDate,
  eventTypeLabel,
  daysUntilEvent,
  daysUntilLabel,
  urgencyClass,
} from "@/lib/utils";
import { GiftCategoryIcon } from "@/components/gift-icons";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  gift_categories: string[];
  gift_other: string;
  high_importance: boolean;
  budget_tier: string | null;
  notes: string;
}

interface Event {
  id: string;
  contact_id: string;
  user_id: string;
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

interface ShownGift {
  id: string;
  year: number;
  event_month: number;
  event_day: number;
  gift_name: string;
  gift_category: string | null;
  gift_partner: string | null;
}

const DAYS_IN_MONTH: Record<number, number> = {
  1: 31, 2: 29, 3: 31, 4: 30, 5: 31, 6: 30,
  7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
};

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2024, i, 1).toLocaleDateString("en-US", { month: "long" }),
}));

const EMPTY_EVENT_FORM = {
  event_type: "birthday",
  event_label: "",
  month: 1,
  day: 1,
  year_started: "",
  one_time: false,
  event_year: "",
  high_importance: false,
  suppress_gifts: false,
};

const URGENCY_STYLES = {
  urgent: "bg-red-100 text-red-800",
  soon: "bg-orange-100 text-orange-800",
  upcoming: "bg-green-100 text-green-800",
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [shownGifts, setShownGifts] = useState<ShownGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");

  // Event modal state
  const [eventModal, setEventModal] = useState<"add" | "edit" | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deleteEventTarget, setDeleteEventTarget] = useState<Event | null>(null);
  const [eventError, setEventError] = useState("");
  const [dayAdjusted, setDayAdjusted] = useState("");

  const supabase = createClient();

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const [contactRes, eventsRes, giftsRes] = await Promise.all([
      supabase.from("contacts").select("*").eq("id", contactId).is("deleted_at", null).single(),
      supabase.from("events").select("*").eq("contact_id", contactId).order("month", { ascending: true }),
      supabase.from("shown_gifts").select("*").eq("contact_id", contactId).order("year", { ascending: false }),
    ]);

    if (!contactRes.data) {
      router.push("/contacts");
      return;
    }

    setContact(contactRes.data);
    setEvents(eventsRes.data || []);
    setShownGifts(giftsRes.data || []);
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    load();
  }, [load]);

  // Max days for selected month
  const maxDays = DAYS_IN_MONTH[eventForm.month] || 31;

  const openAddEvent = () => {
    setEventForm(EMPTY_EVENT_FORM);
    setEditingEventId(null);
    setEventModal("add");
  };

  const openEditEvent = (evt: Event) => {
    setEventForm({
      event_type: evt.event_type,
      event_label: evt.event_label || "",
      month: evt.month,
      day: evt.day,
      year_started: evt.year_started ? String(evt.year_started) : "",
      one_time: evt.one_time,
      event_year: evt.event_year ? String(evt.event_year) : "",
      high_importance: evt.high_importance,
      suppress_gifts: evt.suppress_gifts,
    });
    setEditingEventId(evt.id);
    setEventError("");
    setDayAdjusted("");
    setEventModal("edit");
  };

  const closeEventModal = () => {
    setEventModal(null);
    setEditingEventId(null);
    setEventError("");
    setDayAdjusted("");
  };

  const handleSaveEvent = async () => {
    if (eventForm.event_type === "custom" && !eventForm.event_label.trim()) return;
    setSavingEvent(true);
    setEventError("");

    const clampedDay = Math.min(eventForm.day, maxDays);
    if (clampedDay !== eventForm.day) {
      const monthName = MONTHS.find((m) => m.value === eventForm.month)?.label || "Month";
      setDayAdjusted(`Day adjusted to ${clampedDay} for ${monthName}`);
      setTimeout(() => setDayAdjusted(""), 3000);
    }

    const payload = {
      contact_id: contactId,
      user_id: userId,
      event_type: eventForm.event_type,
      event_label: eventForm.event_type === "custom" ? eventForm.event_label.trim() : "",
      month: eventForm.month,
      day: clampedDay,
      year_started: eventForm.year_started ? parseInt(eventForm.year_started) : null,
      one_time: eventForm.one_time,
      event_year: eventForm.one_time && eventForm.event_year ? parseInt(eventForm.event_year) : null,
      high_importance: eventForm.high_importance,
      suppress_gifts: eventForm.suppress_gifts,
    };

    let error;
    if (eventModal === "add") {
      const res = await supabase.from("events").insert(payload);
      error = res.error;
    } else if (editingEventId) {
      const res = await supabase.from("events").update(payload).eq("id", editingEventId);
      error = res.error;
    }

    setSavingEvent(false);
    if (error) {
      setEventError(error.message || "Failed to save event. Please try again.");
      return;
    }

    closeEventModal();
    await load();
  };

  const handleDeleteEvent = async () => {
    if (!deleteEventTarget) return;
    const { error } = await supabase.from("events").delete().eq("id", deleteEventTarget.id);
    if (error) {
      setEventError(error.message || "Failed to delete event. Please try again.");
      return;
    }
    setDeleteEventTarget(null);
    await load();
  };

  if (loading || !contact) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading contact...</p>
      </div>
    );
  }

  const fullName = `${contact.first_name} ${contact.last_name}`.trim();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/contacts" className="text-sm text-brand-600 hover:underline">
          &larr; Contacts
        </Link>
      </div>

      {/* Contact header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-semibold shrink-0">
            {getInitials(contact.first_name, contact.last_name)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
              {contact.high_importance && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                  Important
                </span>
              )}
            </div>
            <p className="text-gray-500">{relationshipLabel(contact.relationship)}</p>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Gift preferences: </span>
                <span className="text-gray-700">
                  {giftLabel(contact.gift_categories, contact.gift_other)}
                </span>
              </div>
              {contact.budget_tier && (
                <div>
                  <span className="text-gray-400">Budget: </span>
                  <span className="text-gray-700">{budgetLabel(contact.budget_tier)}</span>
                </div>
              )}
              {contact.notes && (
                <div className="sm:col-span-2">
                  <span className="text-gray-400">Notes: </span>
                  <span className="text-gray-700">{contact.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Events section */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Events</h2>
          <button
            onClick={openAddEvent}
            className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            + Add event
          </button>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-gray-400">No events yet. Add a birthday or anniversary.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {events.map((evt) => {
              const days = daysUntilEvent(evt.month, evt.day, evt.one_time, evt.event_year);
              const label =
                evt.event_type === "custom" && evt.event_label
                  ? evt.event_label
                  : eventTypeLabel(evt.event_type);

              return (
                <li key={evt.id} className="px-5 py-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{label}</p>
                      {evt.suppress_gifts && (
                        <span className="text-xs text-gray-400">(no gifts)</span>
                      )}
                      {evt.high_importance && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Important
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(evt.month, evt.day)}
                      {evt.year_started ? ` (since ${evt.year_started})` : ""}
                      {evt.one_time ? " · One-time" : ""}
                    </p>
                  </div>

                  {days !== null && (
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        URGENCY_STYLES[urgencyClass(days)]
                      }`}
                    >
                      {daysUntilLabel(days)}
                    </span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditEvent(evt)}
                      className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteEventTarget(evt)}
                      className="text-gray-400 hover:text-red-500 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Shown gift history */}
      {shownGifts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Past Suggestions</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              What Daysight showed in previous reminder emails.
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {shownGifts.map((sg) => (
              <li key={sg.id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-sm text-gray-500 w-10 shrink-0">{sg.year}</span>
                <span className="text-sm text-gray-400">{formatDate(sg.event_month, sg.event_day)} —</span>
                <span className="text-sm text-gray-700">{sg.gift_name}</span>
                {sg.gift_partner && (
                  <span className="text-xs text-gray-400">via {sg.gift_partner}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Event add/edit modal */}
      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Contact form">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {eventModal === "add" ? "Add Event" : "Edit Event"}
            </h2>

            {eventError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {eventError}
              </div>
            )}

            {dayAdjusted && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {dayAdjusted}
              </div>
            )}

            {/* Event type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Event type</label>
              <select
                value={eventForm.event_type}
                onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="custom">Custom Event</option>
              </select>
            </div>

            {/* Custom label */}
            {eventForm.event_type === "custom" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Event name *</label>
                <input
                  type="text"
                  required
                  value={eventForm.event_label}
                  onChange={(e) => setEventForm({ ...eventForm, event_label: e.target.value })}
                  placeholder="e.g. Graduation"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {/* Month + Day */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={eventForm.month}
                  onChange={(e) => {
                    const m = parseInt(e.target.value);
                    setEventForm({
                      ...eventForm,
                      month: m,
                      day: Math.min(eventForm.day, DAYS_IN_MONTH[m] || 31),
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                <select
                  value={eventForm.day}
                  onChange={(e) => setEventForm({ ...eventForm, day: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {Array.from({ length: maxDays }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year started */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year started (optional)
              </label>
              <input
                type="number"
                value={eventForm.year_started}
                onChange={(e) => setEventForm({ ...eventForm, year_started: e.target.value })}
                placeholder="e.g. 1990"
                min="1900"
                max="2100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* One-time */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.one_time}
                  onChange={(e) => setEventForm({ ...eventForm, one_time: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">One-time event (don&apos;t repeat annually)</span>
              </label>
            </div>

            {/* Event year (for one-time) */}
            {eventForm.one_time && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Event year</label>
                <input
                  type="number"
                  value={eventForm.event_year}
                  onChange={(e) => setEventForm({ ...eventForm, event_year: e.target.value })}
                  placeholder={String(new Date().getFullYear())}
                  min="2024"
                  max="2100"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            )}

            {/* High importance */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.high_importance}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, high_importance: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">High importance (extra early reminder)</span>
              </label>
            </div>

            {/* Suppress gifts */}
            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eventForm.suppress_gifts}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, suppress_gifts: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Skip gift suggestions for this event</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeEventModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={
                  savingEvent ||
                  (eventForm.event_type === "custom" && !eventForm.event_label.trim())
                }
                className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingEvent ? "Saving..." : eventModal === "add" ? "Add Event" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete event confirmation */}
      {deleteEventTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Contact form">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Delete event?</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will permanently remove this{" "}
              {eventTypeLabel(deleteEventTarget.event_type).toLowerCase()} on{" "}
              {formatDate(deleteEventTarget.month, deleteEventTarget.day)}.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteEventTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
