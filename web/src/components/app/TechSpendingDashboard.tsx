"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, ReceiptText, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import type { Receipt } from "@/lib/types";
import { PageHeader, StatCard, Loading, ErrorState, Badge } from "@/components/app/ui";
import { PeriodSelector } from "@/components/app/PeriodSelector";
import { useAuth } from "@/lib/auth";
import {
  type Period,
  currentPeriod,
  inPeriod,
  periodLabel,
  shiftPeriod,
  periodRange,
} from "@/lib/period";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

const amount = (r: Receipt) => r.totalAmount ?? 0;

function statusTone(status: string): "good" | "warn" | "muted" | "default" {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "RECONCILED") return "good";
  if (s === "REJECTED") return "muted";
  if (s === "PENDING" || s === "NEEDS_REVIEW") return "warn";
  return "default";
}

/**
 * Personal spending dashboard for technicians: how much they've expensed via
 * uploaded receipts, navigable by month/year. Reads only the signed-in tech's
 * own receipts (GET /truck-stock/receipts/mine).
 */
export function TechSpendingDashboard() {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(() => currentPeriod("month"));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReceipts(await api.listMyReceipts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load your spending.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inWindow = useMemo(
    () => receipts.filter((r) => inPeriod(r.createdAt, period)),
    [receipts, period],
  );

  const totals = useMemo(() => {
    const sum = (rs: Receipt[]) => rs.reduce((acc, r) => acc + amount(r), 0);
    const isStatus = (r: Receipt, ...s: string[]) =>
      s.includes((r.status ?? "PENDING").toUpperCase());
    return {
      spend: sum(inWindow),
      count: inWindow.length,
      approved: sum(inWindow.filter((r) => isStatus(r, "APPROVED", "RECONCILED"))),
      awaiting: sum(inWindow.filter((r) => isStatus(r, "PENDING", "NEEDS_REVIEW"))),
    };
  }, [inWindow]);

  // Trailing 6-month spend trend, anchored on the selected period, for context.
  const trend = useMemo(() => {
    const out: { name: string; spend: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const p = shiftPeriod({ ...period, granularity: "month" }, -i);
      const { start, end } = periodRange(p);
      const spend = receipts
        .filter((r) => {
          const d = r.createdAt ? new Date(r.createdAt) : null;
          return d && d >= start && d < end;
        })
        .reduce((acc, r) => acc + amount(r), 0);
      out.push({ name: periodLabel(p).slice(0, 3), spend: Math.round(spend) });
    }
    return out;
  }, [receipts, period]);

  if (loading) return <Loading label="Loading your spending…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={`My spending${user?.name ? ", " + user.name.split(" ")[0] : ""}`}
        description="What you've expensed through uploaded receipts."
        action={
          <Link href="/receipts" className="btn-primary">
            <ReceiptText size={16} /> Receipts
          </Link>
        }
      />

      <div className="mb-5">
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={`Spent · ${periodLabel(period)}`} value={money(totals.spend)} icon={Wallet} tone="brand" />
        <StatCard label="Receipts" value={totals.count} icon={ReceiptText} />
        <StatCard label="Approved" value={money(totals.approved)} icon={CheckCircle2} tone="good" />
        <StatCard
          label="Awaiting approval"
          value={money(totals.awaiting)}
          icon={Clock}
          tone={totals.awaiting ? "warn" : "default"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-900">Spend trend (last 6 months)</h2>
          {trend.every((t) => t.spend === 0) ? (
            <p className="py-16 text-center text-sm text-ink-400">No spending recorded yet.</p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ left: -8, right: 8, top: 8 }}>
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
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Receipts · {periodLabel(period)}</h2>
            <Link href="/receipts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              All
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {inWindow.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-400">No receipts this period.</p>
            ) : (
              inWindow.slice(0, 7).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{money(amount(r))}</p>
                    <p className="truncate text-xs text-ink-400">
                      {r.truck?.truckNumber ? `Truck ${r.truck.truckNumber} · ` : ""}
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone(r.status ?? "PENDING")}>
                    {(r.status ?? "PENDING").toLowerCase()}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
