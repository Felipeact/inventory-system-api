"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Truck, Wallet, ReceiptText, TrendingUp, ArrowLeft, Calendar } from "lucide-react";
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
import { PageHeader, StatCard, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { type Period, currentPeriod, inPeriod, periodLabel } from "@/lib/period";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const dateFmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

function statusTone(status: string): "good" | "warn" | "muted" | "default" {
  const s = (status || "").toUpperCase();
  if (s === "APPROVED" || s === "RECONCILED") return "good";
  if (s === "REJECTED") return "muted";
  if (s === "PENDING") return "warn";
  return "default";
}

interface TruckCost {
  truckId: string;
  label: string;
  spend: number;
  count: number;
}

const ALL = "all";

/**
 * Admin view: how much each truck is costing the company via uploaded receipts,
 * navigable by month/year. Shows a fleet-wide overview, and lets the admin drill
 * into a single truck (e.g. "Truck 01") for its spend and receipt detail.
 * Aggregates company receipts client-side.
 */
export default function TruckCostsPage() {
  const { hasPermission } = useAuth();
  const allowed = hasPermission(PERMISSIONS.APPROVE_RECEIPTS);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [trucks, setTrucks] = useState<TruckT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(() => currentPeriod("month"));
  const [selectedTruckId, setSelectedTruckId] = useState<string>(ALL);

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

  const truckIdOf = (r: Receipt) => r.truckId ?? r.truck?.id ?? "unknown";

  // Receipts within the selected month/year window.
  const inWindow = useMemo(
    () => receipts.filter((r) => inPeriod(r.createdAt, period)),
    [receipts, period],
  );

  // Fleet-wide aggregation (used by the "All trucks" overview).
  const { rows, total, count } = useMemo(() => {
    const byTruck = new Map<string, TruckCost>();
    for (const r of inWindow) {
      const id = truckIdOf(r);
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
  }, [inWindow, truckLabel]);

  // Single-truck detail (used when a specific truck is chosen).
  const truckReceipts = useMemo(
    () =>
      inWindow
        .filter((r) => truckIdOf(r) === selectedTruckId)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [inWindow, selectedTruckId],
  );
  const truckSpend = truckReceipts.reduce((s, r) => s + (r.totalAmount ?? 0), 0);
  const selectedLabel = truckLabel.get(selectedTruckId) ?? "Truck";

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

  const sortedTrucks = trucks
    .slice()
    .sort((a, b) => a.truckNumber.localeCompare(b.truckNumber, undefined, { numeric: true }));
  const showingTruck = selectedTruckId !== ALL;

  const chartData = rows
    .slice(0, 10)
    .map((r) => ({ name: r.label.replace("Truck ", "#"), spend: Math.round(r.spend) }));
  const avgPerTruck = rows.length ? total / rows.length : 0;
  const priciest = rows[0];

  return (
    <div>
      <PageHeader
        title="Truck costs"
        description="How much each truck is costing the company, from uploaded receipts."
      />

      {/* Controls: month/year window + truck picker */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <PeriodSelector value={period} onChange={setPeriod} />
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-ink-400" />
          <select
            className="input w-auto"
            value={selectedTruckId}
            onChange={(e) => setSelectedTruckId(e.target.value)}
            aria-label="Choose a truck"
          >
            <option value={ALL}>All trucks</option>
            {sortedTrucks.map((t) => (
              <option key={t.id} value={t.id}>
                Truck {t.truckNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showingTruck ? (
        /* ---------- Single-truck detail ---------- */
        <div>
          <button
            type="button"
            onClick={() => setSelectedTruckId(ALL)}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft size={15} /> All trucks
          </button>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label={`${selectedLabel} spend · ${periodLabel(period)}`}
              value={money(truckSpend)}
              icon={Wallet}
              tone="brand"
            />
            <StatCard label="Receipts" value={truckReceipts.length} icon={ReceiptText} />
            <StatCard
              label="Avg / receipt"
              value={money(truckReceipts.length ? truckSpend / truckReceipts.length : 0)}
              icon={TrendingUp}
            />
            <StatCard label="Latest receipt" value={dateFmt(truckReceipts[0]?.createdAt)} icon={Calendar} />
          </div>

          <div className="card mt-6 p-6">
            <h2 className="text-base font-semibold text-ink-900">
              {selectedLabel} receipts · {periodLabel(period)}
            </h2>
            {truckReceipts.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No receipts this period"
                  description="No receipts were uploaded against this truck in the selected period."
                />
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                      <th className="pb-2 pr-4 font-semibold">Date</th>
                      <th className="pb-2 pr-4 font-semibold">Technician</th>
                      <th className="pb-2 pr-4 font-semibold">Status</th>
                      <th className="pb-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {truckReceipts.map((r) => (
                      <tr key={r.id} className="border-b border-ink-50 last:border-0">
                        <td className="py-2.5 pr-4 text-ink-700">{dateFmt(r.createdAt)}</td>
                        <td className="py-2.5 pr-4 text-ink-700">{r.technician?.name ?? "—"}</td>
                        <td className="py-2.5 pr-4">
                          <Badge tone={statusTone(r.status)}>{(r.status || "PENDING").toUpperCase()}</Badge>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-ink-900">
                          {money(r.totalAmount ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ---------- Fleet-wide overview ---------- */
        <div>
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
                <p className="mt-1 text-xs text-ink-400">Select a truck for its receipt detail.</p>
                <div className="mt-4 space-y-1">
                  {rows.map((r) => (
                    <button
                      key={r.truckId}
                      type="button"
                      onClick={() => setSelectedTruckId(r.truckId)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">{r.label}</p>
                        <p className="truncate text-xs text-ink-400">
                          {r.count} receipt{r.count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-ink-900">{money(r.spend)}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
