"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GIFT_CATEGORIES as CATEGORIES } from "@/lib/constants";


const PRICE_TIERS = ["low", "mid", "high"];
const RELATIONSHIPS = ["family", "friend", "colleague", "other"];
const EVENT_TYPES = ["birthday", "anniversary", "custom"];

interface GiftItem {
  id: string;
  name: string;
  partner: string;
  affiliate_url: string;
  category: string;
  price_tier: string;
  tags: string[];
  relationship_affinities: string[];
  event_affinities: string[];
  is_last_minute: boolean;
  is_active: boolean;
}

const EMPTY_GIFT: Omit<GiftItem, "id"> = {
  name: "", partner: "", affiliate_url: "", category: "flowers", price_tier: "mid",
  tags: [], relationship_affinities: [], event_affinities: [],
  is_last_minute: false, is_active: true,
};

export default function GiftCatalogPage() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<GiftItem, "id">>(EMPTY_GIFT);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [error, setError] = useState("");

  const supabase = createClient();

  useEffect(() => { loadGifts(); }, []);

  async function loadGifts() {
    setLoading(true);
    const { data } = await supabase
      .from("gift_catalog")
      .select("*")
      .order("category")
      .order("name");
    setGifts(data || []);
    setLoading(false);
  }

  function startEdit(gift: GiftItem) {
    setEditingId(gift.id);
    setForm({ ...gift });
    setShowAdd(false);
  }

  function startAdd() {
    setShowAdd(true);
    setEditingId(null);
    setForm({ ...EMPTY_GIFT });
  }

  async function saveGift() {
    setError("");

    // Validate affiliate URL
    if (form.affiliate_url.trim()) {
      try {
        new URL(form.affiliate_url.trim());
      } catch {
        setError("Invalid affiliate URL. Please enter a valid URL (e.g. https://example.com).");
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error: updateError } = await supabase.from("gift_catalog").update(form).eq("id", editingId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("gift_catalog").insert(form);
        if (insertError) throw insertError;
      }
      setEditingId(null);
      setShowAdd(false);
      loadGifts();
    } catch (err: any) {
      setError(`Failed to save gift: ${err.message || "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(gift: GiftItem) {
    setError("");
    try {
      const { error: toggleError } = await supabase
        .from("gift_catalog")
        .update({ is_active: !gift.is_active })
        .eq("id", gift.id);
      if (toggleError) throw toggleError;
      loadGifts();
    } catch (err: any) {
      setError(`Failed to update gift status: ${err.message || "Unknown error"}`);
    }
  }

  const filtered = filterCategory === "all" ? gifts : gifts.filter((g) => g.category === filterCategory);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gift Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">{gifts.length} items · {gifts.filter((g) => g.is_active).length} active</p>
        </div>
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition-colors"
        >
          + Add Gift
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <FilterButton label="All" active={filterCategory === "all"} onClick={() => setFilterCategory("all")} />
        {CATEGORIES.map((c) => (
          <FilterButton key={c} label={c} active={filterCategory === c} onClick={() => setFilterCategory(c)} />
        ))}
      </div>

      {/* Add/Edit form */}
      {(showAdd || editingId) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{editingId ? "Edit Gift" : "Add New Gift"}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Input label="Partner" value={form.partner} onChange={(v) => setForm({ ...form, partner: v })} />
            <Input label="Affiliate URL" value={form.affiliate_url} onChange={(v) => setForm({ ...form, affiliate_url: v })} />
            <Select label="Category" value={form.category} options={CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} />
            <Select label="Price Tier" value={form.price_tier} options={PRICE_TIERS} onChange={(v) => setForm({ ...form, price_tier: v })} />
            <Input label="Tags (comma-separated)" value={form.tags.join(", ")} onChange={(v) => setForm({ ...form, tags: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
            <MultiCheck label="Relationship Affinities" options={RELATIONSHIPS} selected={form.relationship_affinities} onChange={(v) => setForm({ ...form, relationship_affinities: v })} />
            <MultiCheck label="Event Affinities" options={EVENT_TYPES} selected={form.event_affinities} onChange={(v) => setForm({ ...form, event_affinities: v })} />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_last_minute} onChange={(e) => setForm({ ...form, is_last_minute: e.target.checked })} className="rounded" />
                Last-minute eligible
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                Active
              </label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveGift}
              disabled={saving || !form.name.trim() || !form.partner.trim()}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Add"}
            </button>
            <button
              onClick={() => { setEditingId(null); setShowAdd(false); }}
              className="px-4 py-2 text-gray-600 text-sm font-medium hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Gift table */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading catalog...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Partner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tags</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((gift) => (
                <tr key={gift.id} className={`border-b border-gray-100 ${!gift.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{gift.name}</td>
                  <td className="px-4 py-3 text-gray-600">{gift.partner}</td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{gift.category.replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {gift.price_tier === "low" ? "<$30" : gift.price_tier === "mid" ? "$30-75" : "$75+"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{gift.tags.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    {gift.is_active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                    {gift.is_last_minute && (
                      <span className="ml-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Last-min</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => startEdit(gift)} className="text-xs text-brand-600 hover:text-brand-800 font-medium">Edit</button>
                    <button onClick={() => toggleActive(gift)} className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                      {gift.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Reusable form components ────────────────────────────────────────────────

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replace("_", " ")}</option>
        ))}
      </select>
    </div>
  );
}

function MultiCheck({ label, options, selected, onChange }: { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`px-2.5 py-1 text-xs rounded-md border font-medium capitalize transition-colors ${
              selected.includes(o)
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-gray-200 text-gray-500 hover:border-brand-300"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
        active ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {label.replace("_", " ")}
    </button>
  );
}
