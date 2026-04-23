"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getInitials, formatDate } from "@/lib/utils";
import { GiftCategoryIcon } from "@/components/gift-icons";

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_send_hour: number;
  reminder_days_before: number[];
  default_gift_categories: string[];
  monthly_digest_enabled: boolean;
  email_reminders_enabled: boolean;
  gift_suggestions_enabled: boolean;
  product_updates_enabled: boolean;
  partner_offers_enabled: boolean;
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
  { value: "donation", label: "Donation" },
];

const SEND_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM – 9 PM

function formatHour(h: number): string {
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}

const TRASH_HOLD_DAYS = 7;

export default function SettingsPage() {
  const [tab, setTab] = useState("general");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Password tab
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Recycling bin
  const [trashedContacts, setTrashedContacts] = useState<TrashedContact[]>([]);
  const [loadingBin, setLoadingBin] = useState(false);

  // Account deletion
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
        supabase.from("events").select("*").eq("user_id", userId),
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

        // Format date as YYYYMMDD (all-day event uses DATE format, not DATETIME)
        const dateStr = String(evt.month).padStart(2, "0") + String(evt.day).padStart(2, "0");
        const startDate = `2024${dateStr}`; // Use a valid year for formatting (iCal doesn't care)

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

  // Copy subscription URL to clipboard
  const copySubscriptionURL = () => {
    const url = `https://daysight.xyz/api/calendar/${userId}.ics`;
    navigator.clipboard.writeText(url);
    setCopiedToClipboard(true);
    setTimeout(() => setCopiedToClipboard(false), 2000);
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

    if (data) setProfile(data);
    setLoading(false);
  }, []);

  const loadTrashedContacts = useCallback(async () => {
    if (!userId) return;
    setLoadingBin(true);
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: true });

    const now = new Date();
    const withCountdown = (data || []).map((c: any) => {
      const deletedAt = new Date(c.deleted_at);
      const expiresAt = new Date(deletedAt.getTime() + TRASH_HOLD_DAYS * 24 * 60 * 60 * 1000);
      const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      return { ...c, days_left: daysLeft };
    });

    setTrashedContacts(withCountdown);
    setLoadingBin(false);
  }, [userId]);

  const loadCascadeCounts = useCallback(async () => {
    if (!userId) return;
    const [contacts, events] = await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("events").select("id", { count: "exact", head: true }).eq("user_id", userId),
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
        gift_suggestions_enabled: profile.gift_suggestions_enabled,
        product_updates_enabled: profile.product_updates_enabled,
        partner_offers_enabled: profile.partner_offers_enabled,
      })
      .eq("id", userId);

    setSaving(false);
    setSaveMsg(error ? "Failed to save." : "Saved!");
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

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: currentPassword,
    });

    if (signInError) {
      setPasswordError("Current password is incorrect.");
      setChangingPassword(false);
      return;
    }

    // Update password with verified session
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setChangingPassword(false);
    if (error) {
      setPasswordError(error.message);
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
    await supabase.from("contacts").update({ deleted_at: null }).eq("id", id);
    await loadTrashedContacts();
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const handlePermanentDelete = async (id: string) => {
    setDeleteError("");
    try {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
      setConfirmDeleteId(null);
      await loadTrashedContacts();
    } catch (err: any) {
      setDeleteError(`Failed to delete: ${err.message || "Unknown error"}`);
    }
  };

  // Account deletion
  const handleDeleteAccount = async () => {
    setDeleteError("");
    setDeletingAccount(true);
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/");
    } catch (err: any) {
      setDeleteError(`Account deletion failed: ${err.message || "Unknown error"}. Please contact support.`);
      setDeletingAccount(false);
    }
  };

  // Data export
  const handleExport = async () => {
    const [contacts, events] = await Promise.all([
      supabase.from("contacts").select("*").eq("user_id", userId).is("deleted_at", null),
      supabase.from("events").select("*").eq("user_id", userId),
    ]);

    const data = {
      exported_at: new Date().toISOString(),
      profile,
      contacts: contacts.data || [],
      events: events.data || [],
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daysight-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.key === "bin" && trashedContacts.length > 0 && (
              <span className="ml-1.5 bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                {trashedContacts.length}
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
                <input
                  type="text"
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  IANA timezone (e.g. America/New_York)
                </p>
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
                { key: "email_reminders_enabled" as const, label: "Birthday & event reminders" },
                { key: "monthly_digest_enabled" as const, label: "Monthly digest" },
                { key: "gift_suggestions_enabled" as const, label: "Gift suggestions in reminders" },
                { key: "product_updates_enabled" as const, label: "Product updates" },
                { key: "partner_offers_enabled" as const, label: "Partner offers" },
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
                  value={`https://daysight.xyz/api/calendar/${userId}.ics`}
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
                onClick={handleExport}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Export my data
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
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
            Deleted contacts are kept for 7 days before permanent removal.
          </p>

          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
              {deleteError}
            </div>
          )}

          {loadingBin ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : trashedContacts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
              <p className="text-gray-400">The recycling bin is empty.</p>
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

                  {/* Countdown badge */}
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
          )}
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Contact form">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
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
        </div>
      )}

      {/* Calendar help modal */}
      {showCalendarHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Calendar feed help">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}
