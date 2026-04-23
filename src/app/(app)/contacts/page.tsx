"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getInitials, relationshipLabel, giftLabel } from "@/lib/utils";
import { GiftCategoryIcon } from "@/components/gift-icons";

interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  relationship: string;
  gift_categories: string[];
  gift_other: string;
  high_importance: boolean;
  budget_tier: string | null;
  notes: string;
  deleted_at: string | null;
  created_at: string;
}

type ModalMode = "add" | "edit" | null;

const RELATIONSHIPS = [
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "other", label: "Other" },
];

const GIFT_OPTIONS = [
  { value: "flowers", label: "Flowers" },
  { value: "wine", label: "Wine" },
  { value: "treats", label: "Treats" },
  { value: "gift_card", label: "Gift Card" },
  { value: "experiences", label: "Experience" },
  { value: "donation", label: "Donation" },
];

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  relationship: "friend",
  gift_categories: [] as string[],
  gift_other: "",
  high_importance: false,
  budget_tier: "" as string,
  notes: "",
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRel, setFilterRel] = useState("all");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [saveError, setSaveError] = useState("");

  const supabase = createClient();

  const loadContacts = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("first_name");

    setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Filter + search
  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase());
    const matchesRel = filterRel === "all" || c.relationship === filterRel;
    return matchesSearch && matchesRel;
  });

  // Modal handlers
  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalMode("add");
  };

  const openEdit = (c: Contact) => {
    setForm({
      first_name: c.first_name,
      last_name: c.last_name,
      relationship: c.relationship,
      gift_categories: c.gift_categories || [],
      gift_other: c.gift_other || "",
      high_importance: c.high_importance,
      budget_tier: c.budget_tier || "",
      notes: c.notes || "",
    });
    setEditingId(c.id);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
  };

  const toggleGiftCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      gift_categories: prev.gift_categories.includes(cat)
        ? prev.gift_categories.filter((c) => c !== cat)
        : [...prev.gift_categories, cat],
    }));
  };

  const handleSave = async () => {
    if (!form.first_name.trim()) return;
    setSaving(true);
    setSaveError("");

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      relationship: form.relationship,
      gift_categories: form.gift_categories,
      gift_other: form.gift_other.trim(),
      high_importance: form.high_importance,
      budget_tier: form.budget_tier || null,
      notes: form.notes.trim(),
    };

    let error;
    if (modalMode === "add") {
      const res = await supabase.from("contacts").insert({ ...payload, user_id: userId });
      error = res.error;
    } else if (modalMode === "edit" && editingId) {
      const res = await supabase.from("contacts").update(payload).eq("id", editingId);
      error = res.error;
    }

    setSaving(false);
    if (error) {
      setSaveError(error.message || "Failed to save contact. Please try again.");
      return;
    }

    closeModal();
    await loadContacts();
  };

  const handleTrash = async () => {
    if (!deleteTarget) return;
    await supabase
      .from("contacts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", deleteTarget.id);
    setDeleteTarget(null);
    await loadContacts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-400">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-400 mt-1">
            We never contact the people you add — your data stays private.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors whitespace-nowrap"
        >
          + Add contact
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <select
          value={filterRel}
          onChange={(e) => setFilterRel(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          <option value="all">All relationships</option>
          {RELATIONSHIPS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-gray-400">
            {contacts.length === 0
              ? "No contacts yet. Add your first one to get started."
              : "No contacts match your search."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/contacts/${c.id}`}
              className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer block"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {getInitials(c.first_name, c.last_name)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.high_importance && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                      Important
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {relationshipLabel(c.relationship)}
                  {c.gift_categories.length > 0
                    ? ` · ${giftLabel(c.gift_categories, c.gift_other)}`
                    : ""}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                <button
                  onClick={(e) => { e.preventDefault(); openEdit(c); }}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); setDeleteTarget(c); }}
                  className="text-gray-400 hover:text-red-500 text-sm"
                >
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Contact form">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "add" ? "Add Contact" : "Edit Contact"}
            </h2>

            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
                {saveError}
              </div>
            )}

            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First name *
                </label>
                <input
                  type="text"
                  required
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Relationship */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <select
                value={form.relationship}
                onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Gift categories */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gift preferences
              </label>
              <div className="flex flex-wrap gap-2">
                {GIFT_OPTIONS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGiftCategory(g.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors flex items-center gap-1.5 ${
                      form.gift_categories.includes(g.value)
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
            </div>

            {/* Gift other */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Other interests</label>
              <input
                type="text"
                value={form.gift_other}
                onChange={(e) => setForm({ ...form, gift_other: e.target.value })}
                placeholder="e.g. Board games, puzzles"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Budget tier */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Gift budget</label>
              <select
                value={form.budget_tier}
                onChange={(e) => setForm({ ...form, budget_tier: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Any budget</option>
                <option value="low">Under $50</option>
                <option value="mid">$50–$100</option>
                <option value="high">Over $100</option>
              </select>
            </div>

            {/* High importance */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.high_importance}
                  onChange={(e) => setForm({ ...form, high_importance: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">
                  High importance (extra early reminders)
                </span>
              </label>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Anything helpful for gift picking..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.first_name.trim()}
                className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : modalMode === "add" ? "Add Contact" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Contact form">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Move to bin?</h2>
            <p className="text-sm text-gray-500 mb-4">
              <strong>{deleteTarget.first_name} {deleteTarget.last_name}</strong> will be moved to
              the recycling bin. You can restore them within 7 days from Settings.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleTrash}
                className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                Move to bin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
