"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { GIFT_CATEGORIES } from "@/lib/constants";

const CATEGORIES = [...GIFT_CATEGORIES] as string[];

interface GiftItem {
  id: string;
  name: string;
  partner: string;
  affiliate_url: string;
  category: string;
  price_tier: string;
  tags: string[];
  gender_tags: string[];
  relationship_affinities: string[];
  event_affinities: string[];
  is_last_minute: boolean;
  is_active: boolean;
  description: string | null;
  image_url: string | null;
}

export default function GiftCatalogPage() {
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filtered = filterCategory === "all" ? gifts : gifts.filter((g) => g.category === filterCategory);
  const activeCount = gifts.filter((g) => g.is_active).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gift Catalog</h1>
        <p className="text-sm text-gray-500 mt-1">
          {gifts.length} items · {activeCount} active · <span className="italic">Read-only — edit via the master XLS</span>
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <FilterButton label="All" active={filterCategory === "all"} onClick={() => setFilterCategory("all")} />
        {CATEGORIES.map((c) => (
          <FilterButton key={c} label={c} active={filterCategory === c} onClick={() => setFilterCategory(c)} />
        ))}
      </div>

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
              </tr>
            </thead>
            <tbody>
              {filtered.map((gift) => (
                <GiftRow
                  key={gift.id}
                  gift={gift}
                  isExpanded={expandedId === gift.id}
                  onToggle={() => setExpandedId(expandedId === gift.id ? null : gift.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GiftRow({ gift, isExpanded, onToggle }: { gift: GiftItem; isExpanded: boolean; onToggle: () => void }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!gift.is_active ? "opacity-50" : ""} ${isExpanded ? "bg-orange-50/50" : ""}`}
      >
        <td className="px-4 py-3 font-medium text-gray-900">{gift.name}</td>
        <td className="px-4 py-3 text-gray-600">{gift.partner}</td>
        <td className="px-4 py-3 text-gray-600 capitalize">{gift.category.replace("_", " ")}</td>
        <td className="px-4 py-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
            {gift.price_tier === "low" ? "Under $50" : gift.price_tier === "mid" ? "$50–$100" : "Over $100"}
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
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-gray-50/80 border-b border-gray-200">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm max-w-3xl">
              {gift.description && (
                <div className="md:col-span-2">
                  <span className="text-xs font-medium text-gray-500">Description</span>
                  <p className="text-gray-700">{gift.description}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-gray-500">Affiliate URL</span>
                <p className="text-gray-700 truncate">{gift.affiliate_url || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Image URL</span>
                <p className="text-gray-700 truncate">{gift.image_url || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Gender tags</span>
                <p className="text-gray-700 capitalize">{gift.gender_tags?.join(", ") || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Relationship affinities</span>
                <p className="text-gray-700 capitalize">{gift.relationship_affinities?.join(", ") || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500">Event affinities</span>
                <p className="text-gray-700 capitalize">{gift.event_affinities?.join(", ") || "—"}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
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
