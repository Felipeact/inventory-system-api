"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, Wallet, ReceiptText, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import type { Receipt, Truck as TruckT } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, StatCard, Loading, ErrorState, EmptyState } from "@/components/app/ui";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { type Period, currentPeriod, inPeriod, periodLabel } from "@/lib/period";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

interface TruckCost {
  truckId: string;
  label: string;
  spend: number;
  count: number;
}

/**
 * Admin view: how much each truck is costing the company via uploaded receipts,
 * navigable by month/year. Aggregates company receipts client-side.
 */
export default function TruckCostsPage() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(PERMISSIONS.APPROVE_RECEIPTS);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [trucks, setTrucks] = useState<TruckT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(() => currentPeriod("month"));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, t] = await Promise.allSettled([api.listReceipts(), api.listTrucks()]);
      if (r.status === "fulfilled") setReceipts(r.value);
      if (t.status === "fulfilled") setTrucks(t.value);
      if (r.status === "rejected") throw r.reason;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load truck costs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed, load]);

  const truckLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trucks) map.set(t.id, `Truck ${t.truckNumber}`);
    return map;
  }, [trucks]);

  const { rows, total, count } = useMemo(() => {
    const inWindow = receipts.filter((r) => inPeriod(r.createdAt, period));
    const byTruck = new Map<string, TruckCost>();
    for (const r of inWindow) {
      const id = r.truckId ?? r.truck?.id ?? "unknown";
      const label = truckLabel.get(id) ?? r.truck?.truckNumber ?? "Unassigned";
      const cur = byTruck.get(id) ?? { truckId: id, label, spend: 0, count: 0 };
      cur.spend += r.totalAmount ?? 0;
      cur.count += 1;
      byTruck.set(id, cur);
    }
    const rows = Array.from(byTruck.values()).sort((a, b) => b.spend - a.spend);
    return {
      rows,
      total: rows.reduce((s, r) => s + r.spend, 0),
      count: inWindow.length,
    };
  }, [receipts, period, truckLabel]);

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Truck costs" description="Per-truck spending across your fleet." />
        <EmptyState
          title="No access"
          description="You don't have permission to view fleet costs."
        />
      </div>
    );
  }

  if (loading) return <Loading label="Loading truck costs…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const chartData = rows.slice(0, 10).map((r) => ({ name: r.label.replace("Truck ", "#"), spend: Math.round(r.spend) }));
  const avgPerTruck = rows.length ? total / rows.length : 0;
  const priciest = rows[0];

  return (
    <div>
      <PageHeader
        title="Truck costs"
        description="How much each truck is costing the company, from uploaded receipts."
      />

      <div className="mb-5">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Fleet spend · ${periodLabel(period)}`} value={money(total)} icon={Wallet} tone="brand" />
        <StatCard label="Receipts" value={count} icon={ReceiptText} />
        <StatCard label="Avg / truck" value={money(avgPerTruck)} icon={TrendingUp} />
        <StatCard
          label="Highest truck"
          value={priciest ? money(priciest.spend) : money(0)}
          hint={priciest?.label}
          icon={Truck}
          tone={priciest ? "warn" : "default"}
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No spending this period"
            description="No receipts were uploaded against any truck in the selected period."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-base font-semibold text-ink-900">Spend by truck</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -8, right: 8, top: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    formatter={(v: number) => [money(v), "Spend"]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
                  />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]} fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink-900">Breakdown</h2>
            <div className="mt-4 space-y-3">
              {rows.map((r) => (
                <div key={r.truckId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{r.label}</p>
                    <p className="truncate text-xs text-ink-400">
                      {r.count} receipt{r.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink-900">{money(r.spend)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
