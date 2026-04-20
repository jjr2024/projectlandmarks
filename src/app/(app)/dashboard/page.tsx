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

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
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
    }
    load();
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

  const URGENCY_STYLES = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    soon: "bg-orange-100 text-orange-800 border-orange-200",
    upcoming: "bg-green-100 text-green-800 border-green-200",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading your dashboard...</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
          <p className={`text-3xl font-bold ${urgentCount > 0 ? "text-red-600" : "text-gray-900"}`}>
            {urgentCount}
          </p>
        </div>
      </div>

      {/* Privacy note */}
      <p className="text-xs text-gray-400 mb-4">
        Your data is yours — export or delete anytime in Settings.
      </p>

      {/* Upcoming reminders */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming</h2>
        </div>

        {upcoming.length === 0 ? (
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
            {upcoming.map((item) => {
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

                    {/* Urgency badge */}
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${URGENCY_STYLES[urg]}`}
                    >
                      {daysUntilLabel(item.daysUntil)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
