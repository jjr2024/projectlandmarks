"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type DateRange = 7 | 30 | 60;

interface FunnelData {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  purchased: number;
  revenue: number;
}

interface BreakdownRow {
  key: string;
  sent: number;
  clicked: number;
  purchased: number;
  revenue: number;
}

export default function AdminDashboardPage() {
  const [range, setRange] = useState<DateRange>(30);
  const [funnel, setFunnel] = useState<FunnelData>({ sent: 0, delivered: 0, opened: 0, clicked: 0, purchased: 0, revenue: 0 });
  const [byPartner, setByPartner] = useState<BreakdownRow[]>([]);
  const [byCategory, setByCategory] = useState<BreakdownRow[]>([]);
  const [byLead, setByLead] = useState<BreakdownRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - range);
    const sinceStr = since.toISOString();

    // Funnel from reminder_log (sent count) + conversion_events (funnel stages)
    const { count: sentCount } = await supabase
      .from("reminder_log")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", sinceStr);

    const { data: conversionRows } = await supabase
      .from("conversion_events")
      .select("event_type, partner, gift_category, reminder_lead, commission")
      .gte("timestamp", sinceStr);

    // Fetch sent counts per partner/category/lead from reminder_log
    const { data: sentByPartner } = await supabase
      .from("conversion_events")
      .select("partner")
      .eq("event_type", "sent")
      .gte("timestamp", sinceStr);

    const sentPartnerMap = new Map<string, number>();
    for (const row of sentByPartner || []) {
      const pk = row.partner || "unknown";
      sentPartnerMap.set(pk, (sentPartnerMap.get(pk) || 0) + 1);
    }

    const f: FunnelData = { sent: sentCount || 0, delivered: 0, opened: 0, clicked: 0, purchased: 0, revenue: 0 };
    const partnerMap = new Map<string, BreakdownRow>();
    const categoryMap = new Map<string, BreakdownRow>();
    const leadMap = new Map<string, BreakdownRow>();

    for (const row of conversionRows || []) {
      if (row.event_type === "opened") f.opened++;
      if (row.event_type === "clicked") f.clicked++;
      if (row.event_type === "purchased") {
        f.purchased++;
        f.revenue += parseFloat(row.commission || "0");
      }

      // Partner breakdown
      const pk = row.partner || "unknown";
      if (!partnerMap.has(pk)) partnerMap.set(pk, { key: pk, sent: sentPartnerMap.get(pk) || 0, clicked: 0, purchased: 0, revenue: 0 });
      const pr = partnerMap.get(pk)!;
      if (row.event_type === "clicked") pr.clicked++;
      if (row.event_type === "purchased") { pr.purchased++; pr.revenue += parseFloat(row.commission || "0"); }

      // Category breakdown
      const ck = row.gift_category || "unknown";
      if (!categoryMap.has(ck)) categoryMap.set(ck, { key: ck, sent: 0, clicked: 0, purchased: 0, revenue: 0 });
      const cr = categoryMap.get(ck)!;
      if (row.event_type === "clicked") cr.clicked++;
      if (row.event_type === "purchased") { cr.purchased++; cr.revenue += parseFloat(row.commission || "0"); }

      // Lead time breakdown
      const lk = row.reminder_lead ? `${row.reminder_lead}-day` : "unknown";
      if (!leadMap.has(lk)) leadMap.set(lk, { key: lk, sent: 0, clicked: 0, purchased: 0, revenue: 0 });
      const lr = leadMap.get(lk)!;
      if (row.event_type === "clicked") lr.clicked++;
      if (row.event_type === "purchased") { lr.purchased++; lr.revenue += parseFloat(row.commission || "0"); }
    }

    // User count
    const { count: userCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    setFunnel(f);
    setByPartner(Array.from(partnerMap.values()).sort((a, b) => b.revenue - a.revenue));
    setByCategory(Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue));
    setByLead(Array.from(leadMap.values()).sort((a, b) => b.purchased - a.purchased));
    setTotalUsers(userCount || 0);
    setLoading(false);
  }

  const pct = (n: number, d: number) => d === 0 ? "0%" : `${((n / d) * 100).toFixed(1)}%`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{totalUsers} registered users</p>
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {([7, 30, 60] as DateRange[]).map((d) => (
            <button
              key={d}
              onClick={() => setRange(d)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === d ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading analytics...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <KpiCard label="Sent" value={funnel.sent} />
            <KpiCard label="Opened" value={funnel.opened} sub={pct(funnel.opened, funnel.sent)} good={funnel.sent > 0 && funnel.opened / funnel.sent >= 0.2} />
            <KpiCard label="Clicked" value={funnel.clicked} sub={pct(funnel.clicked, funnel.opened)} />
            <KpiCard label="Purchased" value={funnel.purchased} sub={pct(funnel.purchased, funnel.clicked)} good={funnel.clicked > 0 && funnel.purchased / funnel.clicked >= 0.1} />
            <KpiCard label="Revenue" value={`$${funnel.revenue.toFixed(2)}`} sub={funnel.purchased > 0 ? `$${(funnel.revenue / funnel.purchased).toFixed(2)} avg` : undefined} />
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Conversion Funnel</h2>
            <div className="space-y-3">
              <FunnelBar label="Sent" count={funnel.sent} max={funnel.sent} />
              <FunnelBar label="Opened" count={funnel.opened} max={funnel.sent} />
              <FunnelBar label="Clicked" count={funnel.clicked} max={funnel.sent} />
              <FunnelBar label="Purchased" count={funnel.purchased} max={funnel.sent} />
            </div>
          </div>

          {/* Breakdowns */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <BreakdownTable title="By Affiliate Partner" rows={byPartner} />
            <BreakdownTable title="By Gift Category" rows={byCategory} />
            <BreakdownTable title="By Reminder Lead Time" rows={byLead} />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, good }: { label: string; value: string | number; sub?: string; good?: boolean }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && (
        <p className={`text-xs mt-1 font-medium ${good === true ? "text-green-600" : good === false ? "text-red-500" : "text-gray-400"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function FunnelBar({ label, count, max }: { label: string; count: number; max: number }) {
  const width = max === 0 ? 0 : (count / max) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-20">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${width}%` }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-semibold text-gray-700">
          {count} {max > 0 && `(${((count / max) * 100).toFixed(1)}%)`}
        </span>
      </div>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No data yet</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-1.5 font-medium text-gray-500">Name</th>
              <th className="text-right py-1.5 font-medium text-gray-500">Clicks</th>
              <th className="text-right py-1.5 font-medium text-gray-500">Purchases</th>
              <th className="text-right py-1.5 font-medium text-gray-500">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-gray-50">
                <td className="py-1.5 font-medium text-gray-700 capitalize">{r.key}</td>
                <td className="py-1.5 text-right text-gray-600">{r.clicked}</td>
                <td className="py-1.5 text-right text-gray-600">{r.purchased}</td>
                <td className="py-1.5 text-right text-gray-600">${r.revenue.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
