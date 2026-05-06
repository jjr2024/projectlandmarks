"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useRouter } from "next/navigation";
import { getInitials, formatDate } from "@/lib/utils";
import { GiftCategoryIcon } from "@/components/gift-icons";
import { Modal } from "@/components/Modal";

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_send_hour: number;
  reminder_days_before: number[];
  default_gift_categories: string[];
  monthly_digest_enabled: boolean;
  email_reminders_enabled: boolean;
  product_updates_enabled: boolean;
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
}

interface Event {
  id: string;
  contact_id: string;
  event_type: string;
  event_label: string;
  month: number;
  day: number;
  one_time: boolean;
  event_year: number | null;
}

interface TrashedContact {
  id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  deleted_at: string;
  days_left: number;
}

interface TrashedEvent {
  id: string;
  contact_id: string;
  event_type: string;
  event_label: string;
  month: number;
  day: number;
  deleted_at: string;
  days_left: number;
  contact_name: string;
}

const TABS = [
  { key: "general", label: "General" },
  { key: "password", label: "Password" },
  { key: "bin", label: "Recycling Bin" },
];

const REMINDER_OPTIONS = [1, 3, 7, 14, 21];

const GIFT_OPTIONS = [
  { value: "flowers", label: "Flowers" },
  { value: "wine", label: "Wine" },
  { value: "treats", label: "Treats" },
  { value: "gift_card", label: "Gift Card" },
  { value: "experiences", label: "Experience" },
  { value: "home", label: "Home" },
  { value: "accessories", label: "Accessories" },
];

const SEND_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM – 9 PM

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "America/Anchorage", label: "Alaska Time (US)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (US)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Toronto", label: "Eastern Time (Canada)" },
  { value: "America/Vancouver", label: "Pacific Time (Canada)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Central European Time" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Europe/Amsterdam", label: "Amsterdam" },
  { value: "Europe/Rome", label: "Rome" },
  { value: "Europe/Madrid", label: "Madrid" },
  { value: "Europe/Zurich", label: "Zurich" },
  { value: "Europe/Stockholm", label: "Stockholm" },
  { value: "Europe/Helsinki", label: "Helsinki" },
  { value: "Europe/Athens", label: "Athens" },
  { value: "Europe/Moscow", label: "Moscow" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Hong_Kong", label: "Hong Kong" },
  { value: "Asia/Shanghai", label: "China (CST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Asia/Seoul", label: "Korea (KST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
  { value: "Australia/Melbourne", label: "Melbourne" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Pacific/Auckland", label: "New Zealand" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "Africa/Johannesburg", label: "South Africa" },
  { value: "Africa/Lagos", label: "Lagos" },
  { value: "Africa/Cairo", label: "Cairo" },
];

function formatHour(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

import { TRASH_HOLD_DAYS } from "@/lib/constants";

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialProfile, setInitialProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Password tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Recycling bin
  const [trashedContacts, setTrashedContacts] = useState<TrashedContact[]>([]);
  const [trashedEvents, setTrashedEvents] = useState<TrashedEvent[]>([]);
  const [binSubTab, setBinSubTab] = useState<"contacts" | "events">("contacts");
  const [loadingBin, setLoadingBin] = useState(false);

  // Account deletion
  const [showDeleteReasonModal, setShowDeleteReasonModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteReasonOther, setDeleteReasonOther] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [contactCount, setContactCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  // Calendar feed
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [showCalendarHelp, setShowCalendarHelp] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Calendar feed: generate .ics file
  const generateAndDownloadICS = async () => {
    if (!userId) return;

    try {
      const [contactsRes, eventsRes] = await Promise.all([
        supabase.from("contacts").select("*").eq("user_id", userId).is("deleted_at", null),
        supabase.from("events").select("*").eq("user_id", userId).is("deleted_at", null),
      ]);

      const contacts = (contactsRes.data || []) as Contact[];
      const events = (eventsRes.data || []) as Event[];

      // Build a map of contact_id -> contact for quick lookup
      const contactMap = new Map(contacts.map((c) => [c.id, c]));

      // Generate iCalendar
      const icsLines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Daysight//Calendar Feed//EN",
        "CALSCALE:GREGORIAN",
        "X-WR-CALNAME:Daysight Reminders",
      ];

      for (const evt of events) {
        const contact = contactMap.get(evt.contact_id);
        if (!contact) continue;

        // Build summary: "Contact Name's Event Type"
        let summary = `${contact.first_name}`;
        if (contact.last_name) summary += ` ${contact.last_name}`;

        if (evt.event_type === "birthday") {
          summary += "'s Birthday";
        } else if (evt.event_type === "anniversary") {
          summary += "'s Anniversary";
        } else if (evt.event_type === "custom" && evt.event_label) {
          summary += `'s ${evt.event_label}`;
        } else {
          summary += "'s Event";
        }

        // Format date as YYYYMMDD — use current year so calendar apps show upcoming events
        const currentYear = new Date().getFullYear();
        const dateStr = String(evt.month).padStart(2, "0") + String(evt.day).padStart(2, "0");
        const startDate = `${currentYear}${dateStr}`;

        // Unique identifier
        const uid = `event-${evt.id}@daysight.xyz`;

        icsLines.push(
          "BEGIN:VEVENT",
          `DTSTART;VALUE=DATE:${startDate}`,
          `SUMMARY:${escapeICSText(summary)}`,
          "RRULE:FREQ=YEARLY",
          `UID:${uid}`,
          "END:VEVENT"
        );
      }

      icsLines.push("END:VCALENDAR");

      const icsContent = icsLines.join("\r\n");
      const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `daysight-calendar-${new Date().toISOString().split("T")[0]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate calendar:", err);
    }
  };

  // Helper to escape special characters in iCalendar text
  const escapeICSText = (text: string): string => {
    return text.replace(/[\\,;]/g, (char) => `\\${char}`);
  };

  // Calendar subscription URL — eagerly fetched on mount once userId is known
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/calendar-url`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.url) setCalendarUrl(data.url); })
      .catch(() => {});
  }, [userId]);

  const copySubscriptionURL = async () => {
    try {
      const url = calendarUrl ?? (await fetch(`/api/calendar-url`).then((r) => r.json()).then((d) => d.url));
      if (url) {
        setCalendarUrl(url);
        await navigator.clipboard.writeText(url);
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      }
    } catch {
      console.error("Failed to copy calendar URL");
    }
  };

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    setUserEmail(user.email || "");

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setInitialProfile(data);
    }
    setLoading(false);
  }, []);

  const loadTrashedContacts = useCallback(async () => {
    if (!userId) return;
    setLoadingBin(true);

    const [contactsRes, eventsRes, allContactsRes] = await Promise.all([
      supabase
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: true }),
      supabase
        .from("events")
        .select("*")
        .eq("user_id", userId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: true }),
      // Need all contacts (including active ones) to show names for trashed events
      supabase
        .from("contacts")
        .select("id, first_name, last_name")
        .eq("user_id", userId),
    ]);

    const now = new Date();
    const addCountdown = (row: any) => {
      const deletedAt = new Date(row.deleted_at);
      const expiresAt = new Date(deletedAt.getTime() + TRASH_HOLD_DAYS * 24 * 60 * 60 * 1000);
      return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    };

    const contactMap = new Map(
      (allContactsRes.data || []).map((c: any) => [c.id, `${c.first_name} ${c.last_name || ""}`.trim()])
    );

    setTrashedContacts(
      (contactsRes.data || []).map((c: any) => ({ ...c, days_left: addCountdown(c) }))
    );
    setTrashedEvents(
      (eventsRes.data || []).map((e: any) => ({
        ...e,
        days_left: addCountdown(e),
        contact_name: contactMap.get(e.contact_id) || "Unknown contact",
      }))
    );
    setLoadingBin(false);
  }, [userId]);

  const loadCascadeCounts = useCallback(async () => {
    if (!userId) return;
    const [contacts, events] = await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", userId).is("deleted_at", null),
    ]);
    setContactCount(contacts.count || 0);
    setEventCount(events.count || 0);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (tab === "bin" && userId) loadTrashedContacts();
  }, [tab, userId, loadTrashedContacts]);

  useEffect(() => {
    if (userId) loadCascadeCounts();
  }, [userId, loadCascadeCounts]);

  // Unsaved changes detection (General tab only)
  const hasUnsavedChanges =
    profile !== null &&
    initialProfile !== null &&
    JSON.stringify(profile) !== JSON.stringify(initialProfile);

  // Warn on browser close / hard navigation when unsaved changes exist
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // Tab switch guard — intercept and ask for confirmation
  const handleTabSwitch = (key: string) => {
    if (key === tab) return;
    if (tab === "general" && hasUnsavedChanges) {
      setPendingTab(key);
      return;
    }
    setTab(key);
  };

  const confirmTabSwitch = () => {
    if (pendingTab) {
      // Revert to saved state
      if (initialProfile) setProfile(initialProfile);
      setTab(pendingTab);
      setPendingTab(null);
    }
  };

  // General tab handlers
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSaveMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: profile.display_name,
        timezone: profile.timezone,
        preferred_send_hour: profile.preferred_send_hour,
        reminder_days_before: profile.reminder_days_before,
        default_gift_categories: profile.default_gift_categories,
        monthly_digest_enabled: profile.monthly_digest_enabled,
        email_reminders_enabled: profile.email_reminders_enabled,
        product_updates_enabled: profile.product_updates_enabled,
      })
      .eq("id", userId);

    setSaving(false);
    if (error) {
      setSaveMsg("Failed to save.");
    } else {
      setSaveMsg("Saved!");
      setInitialProfile(profile); // Mark current state as saved
    }
    setTimeout(() => setSaveMsg(""), 2000);
  };

  const toggleReminderDay = (day: number) => {
    if (!profile) return;
    const current = profile.reminder_days_before;
    const updated = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => b - a);
    setProfile({ ...profile, reminder_days_before: updated });
  };

  const toggleDefaultGift = (cat: string) => {
    if (!profile) return;
    const current = profile.default_gift_categories;
    const updated = current.includes(cat)
      ? current.filter((c) => c !== cat)
      : [...current, cat];
    setProfile({ ...profile, default_gift_categories: updated });
  };

  // Password tab
  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setChangingPassword(true);

    // Verify current password via reauthenticate (nonce-based, no new session)
    const { error: reauthError } = await supabase.auth.reauthenticate();

    if (reauthError) {
      // reauthenticate() sends a nonce to the user's email; if it fails, the session
      // is invalid or the user can't be verified. Fall back to a clear message.
      setPasswordError("Unable to verify your identity. Please sign out and sign back in, then try again.");
      setChangingPassword(false);
      return;
    }

    // Update password with verified session
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setChangingPassword(false);
    if (error) {
      setPasswordError(friendlyError(error, "update your password"));
    } else {
      setPasswordSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Recycling bin
  const handleRestore = async (id: string) => {
    setConfirmDeleteId(null);
    // Read the contact's deleted_at so we can scope the event restore to only
    // cascade-deleted events (same timestamp). Individually trashed events
    // will have a different, earlier deleted_at and stay in the bin.
    const { data: contact } = await supabase
      .from("contacts")
      .select("deleted_at")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    // Restore the contact
    await supabase.from("contacts").update({ deleted_at: null }).eq("id", id).eq("user_id", userId);
    // Only restore child events whose deleted_at matches the contact's (cascade-deleted)
    if (contact?.deleted_at) {
      await supabase
        .from("events")
        .update({ deleted_at: null })
        .eq("contact_id", id)
        .eq("user_id", userId)
        .eq("deleted_at", contact.deleted_at);
    }
    await loadTrashedContacts();
  };

  const handleRestoreEvent = async (id: string) => {
    setConfirmDeleteId(null);
    await supabase.from("events").update({ deleted_at: null }).eq("id", id).eq("user_id", userId);
    await loadTrashedContacts();
  };

  const handlePermanentDeleteEvent = async (id: string) => {
    setDeleteError("");
    try {
      const { error } = await supabase.from("events").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      setConfirmDeleteId(null);
      await loadTrashedContacts();
    } catch (err: any) {
      setDeleteError(friendlyError(err, "permanently delete this event"));
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handlePermanentDelete = async (id: string) => {
    setDeleteError("");
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", id).eq("user_id", userId);
      if (error) throw error;
      setConfirmDeleteId(null);
      await loadTrashedContacts();
    } catch (err: any) {
      setDeleteError(friendlyError(err, "permanently delete this contact"));
    }
  };

  // Account deletion — uses RPC for atomic cascade across all tables
  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeletingAccount(true);
    try {
      const { error } = await supabase.rpc("delete_user_account", {
        target_user_id: userId,
      });
      if (error) throw error;
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err: any) {
      setDeleteError(`Account deletion failed: ${err.message || "Unknown error"}. Please contact support.`);
      setDeletingAccount(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabSwitch(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.key === "bin" && (trashedContacts.length + trashedEvents.length) > 0 && (
              <span className="ml-1.5 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {trashedContacts.length + trashedEvents.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── General Tab ── */}
      {tab === "general" && (
        <div className="space-y-8">
          {/* Profile */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                <input
                  type="text"
                  value={profile.display_name}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                  {/* Show current value if not in the preset list */}
                  {!TIMEZONES.some((tz) => tz.value === profile.timezone) && profile.timezone && (
                    <option value={profile.timezone}>{profile.timezone}</option>
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* Reminders */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Reminder Timing</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remind me this many days before
              </label>
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleReminderDay(d)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      profile.reminder_days_before.includes(d)
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                    }`}
                  >
                    {d} day{d !== 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preferred send time
              </label>
              <select
                value={profile.preferred_send_hour}
                onChange={(e) =>
                  setProfile({ ...profile, preferred_send_hour: parseInt(e.target.value) })
                }
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {SEND_HOURS.map((h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Email preferences */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Email Preferences</h2>
            <div className="space-y-3">
              {[
                { key: "email_reminders_enabled" as const, label: "Event reminders" },
                { key: "monthly_digest_enabled" as const, label: "Monthly digest" },
                { key: "product_updates_enabled" as const, label: "Product updates" },
              ].map((pref) => (
                <label key={pref.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile[pref.key]}
                    onChange={(e) => setProfile({ ...profile, [pref.key]: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{pref.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Calendar feed */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Calendar Feed</h2>
            <p className="text-sm text-gray-500 mb-4">
              Add your events to Google Calendar, Outlook, Apple Calendar, or any app that supports iCalendar (.ics) files.
            </p>

            {/* Download .ics button */}
            <div className="mb-5">
              <p className="text-sm font-medium text-gray-700 mb-2">Download as .ics file</p>
              <button
                onClick={generateAndDownloadICS}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Download .ics
              </button>
              <p className="text-xs text-gray-400 mt-2">
                This downloads a one-time snapshot of your current events. It won&apos;t update automatically as you add or change contacts.
                For a live feed that stays in sync, use the subscription URL below instead.
              </p>
            </div>

            {/* Subscription URL */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Subscribe to calendar feed</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={calendarUrl ?? ""}
                  placeholder="Loading calendar URL…"
                  readOnly
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 focus:outline-none"
                />
                <button
                  onClick={copySubscriptionURL}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  {copiedToClipboard ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Paste this URL in your calendar app&apos;s &ldquo;Subscribe to calendar&rdquo; option.{" "}
                <button
                  type="button"
                  onClick={() => setShowCalendarHelp(true)}
                  className="text-brand-600 hover:text-brand-700 font-medium"
                >
                  How do I use this?
                </button>
              </p>
            </div>
          </section>

          {/* Default gift categories */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Default Gift Preferences</h2>
            <p className="text-sm text-gray-500 mb-4">
              Used when a contact doesn&apos;t have their own gift preferences set.
            </p>
            <div className="flex flex-wrap gap-2">
              {GIFT_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleDefaultGift(g.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                    profile.default_gift_categories.includes(g.value)
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                  }`}
                >
                  <GiftCategoryIcon
                    category={g.value}
                    className="w-4 h-4"
                    strokeWidth={2}
                  />
                  {g.label}
                </button>
              ))}
            </div>
          </section>

          {/* Data & Privacy */}
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Data & Privacy</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setDeleteReason("");
                  setDeleteReasonOther("");
                  setShowDeleteReasonModal(true);
                }}
                className="border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                Delete my account
              </button>
            </div>
          </section>

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saveMsg && (
              <span className="text-sm text-green-600 font-medium">{saveMsg}</span>
            )}
            {hasUnsavedChanges && !saveMsg && (
              <span className="text-sm text-amber-600 font-medium">Unsaved changes</span>
            )}
          </div>
        </div>
      )}

      {/* ── Password Tab ── */}
      {tab === "password" && (
        <div className="max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {passwordSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="mt-6 bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {changingPassword ? "Updating..." : "Update password"}
            </button>
          </div>
        </div>
      )}

      {/* ── Recycling Bin Tab ── */}
      {tab === "bin" && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Deleted items are kept for {TRASH_HOLD_DAYS} days before permanent removal.
          </p>

          {/* Sub-tabs: Contacts / Events */}
          <div className="flex gap-1 mb-4">
            {(["contacts", "events"] as const).map((st) => (
              <button
                key={st}
                onClick={() => { setBinSubTab(st); setConfirmDeleteId(null); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  binSubTab === st
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {st === "contacts" ? "Contacts" : "Events"}
                {st === "contacts" && trashedContacts.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({trashedContacts.length})</span>
                )}
                {st === "events" && trashedEvents.length > 0 && (
                  <span className="ml-1.5 text-xs opacity-70">({trashedEvents.length})</span>
                )}
              </button>
            ))}
          </div>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {deleteError}
            </div>
          )}

          {loadingBin ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : binSubTab === "contacts" ? (
            /* ── Contacts sub-tab ── */
            trashedContacts.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
                <p className="text-gray-400">No deleted contacts.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {trashedContacts.map((c) => (
                  <div key={c.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-semibold shrink-0">
                      {getInitials(c.first_name, c.last_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {c.days_left === 0
                          ? "Expires today"
                          : `${c.days_left} day${c.days_left !== 1 ? "s" : ""} left`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestore(c.id)}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        Restore
                      </button>
                      {confirmDeleteId === c.id ? (
                        <>
                          <span className="text-xs text-gray-500">Are you sure?</span>
                          <button
                            onClick={() => handlePermanentDelete(c.id)}
                            className="text-red-600 hover:text-red-700 text-xs font-semibold"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="text-red-500 hover:text-red-600 text-sm font-medium"
                        >
                          Delete forever
                        </button>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        c.days_left <= 1
                          ? "bg-red-100 text-red-700"
                          : c.days_left <= 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {c.days_left}d
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* ── Events sub-tab ── */
            trashedEvents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
                <p className="text-gray-400">No deleted events.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {trashedEvents.map((evt) => (
                  <div key={evt.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-700">
                        {evt.event_type === "custom" && evt.event_label
                          ? evt.event_label
                          : evt.event_type.charAt(0).toUpperCase() + evt.event_type.slice(1)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {evt.contact_name} · {evt.month}/{evt.day} · {evt.days_left === 0
                          ? "Expires today"
                          : `${evt.days_left} day${evt.days_left !== 1 ? "s" : ""} left`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRestoreEvent(evt.id)}
                        className="text-brand-600 hover:text-brand-700 text-sm font-medium"
                      >
                        Restore
                      </button>
                      {confirmDeleteId === evt.id ? (
                        <>
                          <span className="text-xs text-gray-500">Are you sure?</span>
                          <button
                            onClick={() => handlePermanentDeleteEvent(evt.id)}
                            className="text-red-600 hover:text-red-700 text-xs font-semibold"
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(evt.id)}
                          className="text-red-500 hover:text-red-600 text-sm font-medium"
                        >
                          Delete forever
                        </button>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        evt.days_left <= 1
                          ? "bg-red-100 text-red-700"
                          : evt.days_left <= 3
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {evt.days_left}d
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Unsaved changes confirmation modal */}
      {/* Escape = Stay (safe default for destructive guard) */}
      <Modal open={!!pendingTab} onClose={() => setPendingTab(null)} label="Unsaved changes" panelClassName="max-w-xs">
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Unsaved changes</h2>
            <p className="text-sm text-gray-500 mb-5">
              You have unsaved changes in your settings. Discard them?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingTab(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Stay
              </button>
              <button
                onClick={confirmTabSwitch}
                className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Discard
              </button>
            </div>
        </div>
      </Modal>

      {/* Delete reason modal (optional step before confirmation) */}
      <Modal open={showDeleteReasonModal} onClose={() => setShowDeleteReasonModal(false)} label="Delete reason">
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">We&apos;re sorry to see you go</h2>
            <p className="text-sm text-gray-500 mb-4">
              Mind sharing why? This helps us improve Daysight.
            </p>

            <div className="space-y-2 mb-4">
              {[
                "It's too much effort to use",
                "Gift suggestions aren't helpful",
                "I'm switching to a different option",
                "Other",
              ].map((reason) => (
                <label key={reason} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="deleteReason"
                    checked={deleteReason === reason}
                    onChange={() => setDeleteReason(reason)}
                    className="w-4 h-4 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700">{reason}</span>
                </label>
              ))}
              {deleteReason === "Other" && (
                <textarea
                  value={deleteReasonOther}
                  onChange={(e) => setDeleteReasonOther(e.target.value)}
                  placeholder="Tell us more..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mt-1"
                />
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteReasonModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteReasonModal(false);
                  setShowDeleteModal(true);
                }}
                className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Continue
              </button>
            </div>
        </div>
      </Modal>

      {/* Delete account modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} label="Delete account">
        <div>
            <h2 className="text-lg font-bold text-red-600 mb-2">Delete your account?</h2>
            <p className="text-sm text-gray-500 mb-4">
              This will permanently delete your account and all associated data:
              <strong> {contactCount} contact{contactCount !== 1 ? "s" : ""}</strong> and
              <strong> {eventCount} event{eventCount !== 1 ? "s" : ""}</strong>.
              This cannot be undone.
            </p>
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-3 text-xs">
                {deleteError}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">
                Type <strong>DELETE</strong> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deletingAccount}
                className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deletingAccount ? "Deleting..." : "Delete my account"}
              </button>
            </div>
        </div>
      </Modal>

      {/* Calendar help modal */}
      <Modal open={showCalendarHelp} onClose={() => setShowCalendarHelp(false)} label="Calendar feed help" panelClassName="max-w-md max-h-[80vh] overflow-y-auto">
        <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">How to use the calendar feed</h2>
              <button
                onClick={() => setShowCalendarHelp(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Google Calendar</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Go to Settings → Add other calendars (+ icon)</li>
                  <li>Choose &ldquo;Subscribe to calendar&rdquo;</li>
                  <li>Paste the subscription URL</li>
                  <li>Click Subscribe</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Outlook / Microsoft 365</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Go to Settings → Calendars → Add calendar</li>
                  <li>Choose &ldquo;Subscribe from web&rdquo;</li>
                  <li>Paste the subscription URL</li>
                  <li>Click Subscribe</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Apple Calendar</h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>Go to File → New Calendar Subscription</li>
                  <li>Paste the subscription URL</li>
                  <li>Click Subscribe</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                Your subscription URL is unique to your account. Don&apos;t share it with others.
              </div>
            </div>

            <button
              onClick={() => setShowCalendarHelp(false)}
              className="mt-5 w-full bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              Got it
            </button>
        </div>
      </Modal>
    </div>
  );
}
