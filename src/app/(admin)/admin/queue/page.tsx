"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface QueueItem {
  eventId: string;
  userId: string;
  userName: string;
  contactName: string;
  contactId: string;
  eventType: string;
  eventLabel: string;
  month: number;
  day: number;
  daysUntil: number;
  highImportance: boolean;
  relationship: string;
  giftCategories: string[];
  budgetTier: string | null;
}

interface WindowSlot {
  daysBefore: number;
  label: string;
  override: { id?: string; custom_message: string } | null;
  alreadySent: boolean;
}

export default function EmailQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [windowSlots, setWindowSlots] = useState<WindowSlot[]>([]);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const now = new Date();
  const year = now.getFullYear();

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    setLoading(true);

    // Get all events with contacts for the next 21 days
    const { data: events } = await supabase
      .from("events")
      .select(`
        id, event_type, event_label, month, day, high_importance, user_id,
        contacts!inner ( id, first_name, last_name, relationship, gift_categories, budget_tier, deleted_at )
      `)
      .is("contacts.deleted_at", null);

    if (!events) { setLoading(false); return; }

    // Get user profiles and emails
    const userIds = [...new Set(events.map((e) => e.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const queueItems: QueueItem[] = [];
    for (const event of events) {
      const contact = event.contacts as any;
      const eventDate = nextOccurrence(event.month, event.day, now);
      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0 || daysUntil > 21) continue;

      const profile = profileMap.get(event.user_id);

      queueItems.push({
        eventId: event.id,
        userId: event.user_id,
        userName: profile?.display_name || event.user_id,
        userName: profile?.display_name || "Unknown",
        contactName: `${contact.first_name}${contact.last_name ? " " + contact.last_name : ""}`,
        contactId: contact.id,
        eventType: event.event_type,
        eventLabel: event.event_label,
        month: event.month,
        day: event.day,
        daysUntil,
        highImportance: event.high_importance,
        relationship: contact.relationship,
        giftCategories: contact.gift_categories || [],
        budgetTier: contact.budget_tier,
      });
    }

    queueItems.sort((a, b) => a.daysUntil - b.daysUntil);
    setItems(queueItems);
    setLoading(false);
  }

  async function expandItem(item: QueueItem) {
    const itemKey = `${item.userId}-${item.eventId}`;
    if (expandedId === itemKey) {
      setExpandedId(null);
      return;
    }
    setExpandedId(itemKey);
    setEditingSlot(null);

    // Determine which windows apply
    const windows: { daysBefore: number; label: string }[] = [];
    if (item.highImportance) windows.push({ daysBefore: 21, label: "21-day (high importance)" });
    windows.push({ daysBefore: 7, label: "7-day" });
    windows.push({ daysBefore: 3, label: "3-day" });

    // Fetch existing overrides for this event
    const { data: overrides } = await supabase
      .from("email_overrides")
      .select("id, days_before, custom_message")
      .eq("user_id", item.userId)
      .eq("event_id", item.eventId)
      .eq("event_year", year);

    // Fetch already-sent reminders
    const { data: sentLogs } = await supabase
      .from("reminder_log")
      .select("days_before")
      .eq("user_id", item.userId)
      .eq("event_id", item.eventId)
      .in("status", ["sent", "delivered", "opened", "clicked"])
      .eq("event_date", `${year}-${String(item.month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`);

    const sentSet = new Set((sentLogs || []).map((l) => l.days_before));

    const slots: WindowSlot[] = windows.map((w) => {
      const match = (overrides || []).find((o) => o.days_before === w.daysBefore);
      return {
        daysBefore: w.daysBefore,
        label: w.label,
        override: match ? { id: match.id, custom_message: match.custom_message } : null,
        alreadySent: sentSet.has(w.daysBefore),
      };
    });

    setWindowSlots(slots);
  }

  const [error, setError] = useState("");

  async function saveMessage(item: QueueItem, slot: WindowSlot) {
    setSaving(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (slot.override?.id) {
        const { error: updateError } = await supabase
          .from("email_overrides")
          .update({ custom_message: messageText, updated_at: new Date().toISOString() })
          .eq("id", slot.override.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("email_overrides")
          .insert({
            user_id: item.userId,
            event_id: item.eventId,
            days_before: slot.daysBefore,
            event_year: year,
            custom_message: messageText,
            created_by: user?.id || null,
          });
        if (insertError) throw insertError;
      }

      setEditingSlot(null);
      expandItem(item);
    } catch (err: any) {
      setError(`Failed to save message: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMessage(slot: WindowSlot, item: QueueItem) {
    if (!slot.override?.id) return;
    setError("");

    try {
      const { error: deleteError } = await supabase
        .from("email_overrides")
        .delete()
        .eq("id", slot.override.id);
      if (deleteError) throw deleteError;
      expandItem(item);
    } catch (err: any) {
      setError(`Failed to delete message: ${err.message || "Unknown error"}`);
    }
  }

  const urgencyColor = (days: number) => {
    if (days <= 3) return "bg-red-100 text-red-700";
    if (days <= 7) return "bg-orange-100 text-orange-700";
    return "bg-green-100 text-green-700";
  };

  const formatDate = (month: number, day: number) => {
    return new Date(2024, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Upcoming reminders in the next 21 days. Click any row to add a custom message.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading queue...</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500">No upcoming reminders in the next 21 days.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Recipient</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Lead</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const itemKey = `${item.userId}-${item.eventId}`;
                  const isExpanded = expandedId === itemKey;
                  return (
                    <QueueRow
                      key={itemKey}
                      item={item}
                      isExpanded={isExpanded}
                      onToggle={() => expandItem(item)}
                      windowSlots={isExpanded ? windowSlots : []}
                      editingSlot={editingSlot}
                      messageText={messageText}
                      saving={saving}
                      onEditSlot={(idx) => {
                        setEditingSlot(idx);
                        setMessageText(windowSlots[idx]?.override?.custom_message || "");
                      }}
                      onMessageChange={setMessageText}
                      onSave={(slot) => saveMessage(item, slot)}
                      onDelete={(slot) => deleteMessage(slot, item)}
                      onCancel={() => setEditingSlot(null)}
                      urgencyColor={urgencyColor}
                      formatDate={formatDate}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Queue row with expandable detail ────────────────────────────────────────

interface QueueRowProps {
  item: QueueItem;
  isExpanded: boolean;
  onToggle: () => void;
  windowSlots: WindowSlot[];
  editingSlot: number | null;
  messageText: string;
  saving: boolean;
  onEditSlot: (idx: number) => void;
  onMessageChange: (text: string) => void;
  onSave: (slot: WindowSlot) => void;
  onDelete: (slot: WindowSlot) => void;
  onCancel: () => void;
  urgencyColor: (days: number) => string;
  formatDate: (month: number, day: number) => string;
}

function QueueRow({
  item, isExpanded, onToggle, windowSlots, editingSlot, messageText, saving,
  onEditSlot, onMessageChange, onSave, onDelete, onCancel, urgencyColor, formatDate,
}: QueueRowProps) {
  const typeLabel = { birthday: "Birthday", anniversary: "Anniversary", custom: item.eventLabel || "Custom" }[item.eventType] || item.eventType;
  const hasOverride = windowSlots.some((s) => s.override);

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? "bg-orange-50/50" : ""}`}
      >
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900 text-xs">{item.userName}</p>
        </td>
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900">{item.contactName}</p>
          <p className="text-xs text-gray-500 capitalize">{item.relationship}</p>
        </td>
        <td className="px-4 py-3">
          <span className="text-gray-700">{typeLabel}</span>
          {item.highImportance && <span className="ml-1 text-xs text-orange-600 font-semibold">★</span>}
        </td>
        <td className="px-4 py-3 text-gray-600">{formatDate(item.month, item.day)}</td>
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${urgencyColor(item.daysUntil)}`}>
            {item.daysUntil === 0 ? "Today" : item.daysUntil === 1 ? "Tomorrow" : `${item.daysUntil}d`}
          </span>
        </td>
        <td className="px-4 py-3">
          {hasOverride && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">Custom msg</span>}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50/80 border-b border-gray-200">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Reminder Windows</p>

              <div className="space-y-3">
                {windowSlots.map((slot, idx) => (
                  <div key={slot.daysBefore} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{slot.label}</span>
                        {slot.alreadySent && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Sent</span>
                        )}
                      </div>
                      {!slot.alreadySent && editingSlot !== idx && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditSlot(idx); }}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                        >
                          {slot.override ? "Edit message" : "Add message"}
                        </button>
                      )}
                    </div>

                    {/* Show existing message */}
                    {slot.override && editingSlot !== idx && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 mt-2">
                        <p className="text-sm text-gray-700 whitespace-pre-line">{slot.override.custom_message}</p>
                      </div>
                    )}

                    {/* Editor */}
                    {editingSlot === idx && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={messageText}
                          onChange={(e) => onMessageChange(e.target.value)}
                          placeholder="Write a personal note that will appear in this reminder email, between the intro and gift suggestions..."
                          rows={3}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onSave(slot); }}
                            disabled={saving || !messageText.trim()}
                            className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
                          >
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onCancel(); }}
                            className="px-3 py-1.5 text-gray-600 text-xs font-medium hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          {slot.override && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
                              className="ml-auto px-3 py-1.5 text-red-600 text-xs font-medium hover:text-red-800"
                            >
                              Remove message
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 text-xs text-gray-400">
                Gifts: {item.giftCategories.length > 0 ? item.giftCategories.join(", ") : "default"} · Budget: {item.budgetTier || "any"}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function nextOccurrence(month: number, day: number, from: Date): Date {
  const thisYear = from.getFullYear();
  let d = new Date(thisYear, month - 1, day);
  if (d < from) d = new Date(thisYear + 1, month - 1, day);
  return d;
}
