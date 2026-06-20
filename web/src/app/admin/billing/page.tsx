"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  LogOut,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Percent,
  Building2,
  Users,
  AlertTriangle,
  Check,
  Pencil,
  X,
} from "lucide-react";
import { superAdminApi, superAdminStore, ApiError } from "@/lib/api";
import type { AdminAnalytics, BillingCompany } from "@/lib/types";
import { Badge } from "@/components/app/ui";

/** Cost assumptions used to turn revenue into profit. Persisted per operator. */
const COST_KEY = "sp_admin_cost_per_user";
const FEE_KEY = "sp_admin_fee_pct";
const DEFAULT_COST_PER_USER = 4;
const DEFAULT_FEE_PCT = 3;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usd2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function readNumber(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export default function BillingDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [costPerUser, setCostPerUser] = useState(DEFAULT_COST_PER_USER);
  const [feePct, setFeePct] = useState(DEFAULT_FEE_PCT);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await superAdminApi.analytics());
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!superAdminStore.token()) {
      router.replace("/admin/login");
      return;
    }
    setCostPerUser(readNumber(COST_KEY, DEFAULT_COST_PER_USER));
    setFeePct(readNumber(FEE_KEY, DEFAULT_FEE_PCT));
    setReady(true);
    void load();
  }, [router, load]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(COST_KEY, String(costPerUser));
  }, [costPerUser, ready]);
  useEffect(() => {
    if (ready) window.localStorage.setItem(FEE_KEY, String(feePct));
  }, [feePct, ready]);

  /** Profit for a single company from current cost assumptions. */
  const profitOf = useCallback(
    (c: BillingCompany) => {
      const infra = c.seats * costPerUser;
      const fees = c.monthlyRevenue * (feePct / 100);
      const cost = infra + fees;
      return { cost, profit: c.monthlyRevenue - cost };
    },
    [costPerUser, feePct],
  );

  const totals = useMemo(() => {
    if (!data) return null;
    const mrr = data.metrics.mrr;
    const infra = data.metrics.activeSeats * costPerUser;
    const fees = mrr * (feePct / 100);
    const cost = infra + fees;
    const profit = mrr - cost;
    return {
      mrr,
      arr: data.metrics.arr,
      cost,
      profit,
      annualProfit: profit * 12,
      margin: mrr > 0 ? (profit / mrr) * 100 : 0,
    };
  }, [data, costPerUser, feePct]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 size={26} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-5 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2 font-semibold text-ink-900">
          <ShieldCheck size={20} className="text-brand-600" /> Platform Admin
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin" className="btn-ghost text-sm">
            <ArrowLeft size={16} /> Console
          </Link>
          <button onClick={load} className="btn-ghost p-2" title="Refresh" aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => {
              superAdminApi.logout();
              router.replace("/admin/login");
            }}
            className="btn-secondary"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Revenue &amp; profit</h1>
            <p className="mt-1 text-sm text-ink-500">
              What every customer pays, your recurring revenue, and estimated profit after costs.
            </p>
          </div>
          <CostControls
            costPerUser={costPerUser}
            feePct={feePct}
            onCost={setCostPerUser}
            onFee={setFeePct}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        {loading || !data || !totals ? (
          <div className="grid place-items-center py-20">
            <Loader2 size={24} className="animate-spin text-ink-400" />
          </div>
        ) : (
          <>
            {data.metrics.companiesNeedingPricing > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <AlertTriangle size={16} />
                {data.metrics.companiesNeedingPricing} active{" "}
                {data.metrics.companiesNeedingPricing === 1 ? "company is" : "companies are"} on a
                custom plan with no price set — their revenue counts as $0 until you set a monthly
                amount below.
              </div>
            )}

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={DollarSign} label="MRR" value={usd.format(totals.mrr)} hint="Monthly recurring revenue" tone="brand" />
              <Kpi icon={TrendingUp} label="ARR" value={usd.format(totals.arr)} hint="Annual run-rate" />
              <Kpi
                icon={DollarSign}
                label="Est. monthly profit"
                value={usd.format(totals.profit)}
                hint={`${usd.format(totals.annualProfit)} / yr after costs`}
                tone={totals.profit >= 0 ? "good" : "bad"}
              />
              <Kpi
                icon={Percent}
                label="Gross margin"
                value={`${totals.margin.toFixed(0)}%`}
                hint={`${usd.format(totals.cost)} est. monthly cost`}
              />
              <Kpi icon={Building2} label="Active customers" value={String(data.metrics.activeCompanies)} hint={`${data.metrics.totalCompanies} total`} />
              <Kpi icon={Users} label="Paid seats" value={String(data.metrics.activeSeats)} hint="Across active customers" />
              <Kpi icon={DollarSign} label="ARPA" value={usd.format(data.metrics.arpa)} hint="Avg revenue / account" />
              <Kpi icon={Building2} label="Paying customers" value={String(data.metrics.payingCompanies)} hint="Revenue > $0" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <PlanBreakdownCard data={data} />
              <SignupsCard data={data} />
            </div>

            <CustomersTable data={data} profitOf={profitOf} onChanged={load} />
          </>
        )}
      </main>
    </div>
  );
}

function CostControls({
  costPerUser,
  feePct,
  onCost,
  onFee,
}: {
  costPerUser: number;
  feePct: number;
  onCost: (n: number) => void;
  onFee: (n: number) => void;
}) {
  return (
    <div className="flex items-end gap-3 rounded-xl border border-ink-100 bg-white p-3">
      <div>
        <label className="label flex items-center gap-1 text-xs">Infra cost / user / mo</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-400">$</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={costPerUser}
            onChange={(e) => onCost(Math.max(0, Number(e.target.value)))}
            className="input h-9 w-24 pl-5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="label text-xs">Payment fee</label>
        <div className="relative">
          <input
            type="number"
            min={0}
            step={0.1}
            value={feePct}
            onChange={(e) => onFee(Math.max(0, Number(e.target.value)))}
            className="input h-9 w-20 pr-6 text-sm"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400">%</span>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand" | "good" | "bad";
}) {
  const valueTone =
    tone === "good"
      ? "text-green-600"
      : tone === "bad"
        ? "text-red-600"
        : tone === "brand"
          ? "text-brand-700"
          : "text-ink-900";
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
        <Icon size={14} /> {label}
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function PlanBreakdownCard({ data }: { data: AdminAnalytics }) {
  const maxMrr = Math.max(1, ...data.planBreakdown.map((p) => p.mrr));
  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-ink-900">Revenue by plan</h2>
      <div className="mt-4 space-y-4">
        {data.planBreakdown.map((p) => (
          <div key={p.plan}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-800">
                {p.plan}
                <span className="ml-2 text-xs text-ink-400">
                  {p.activeCompanies} active · {p.seats} seats
                </span>
              </span>
              <span className="font-semibold text-ink-900">{usd.format(p.mrr)}/mo</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${(p.mrr / maxMrr) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SignupsCard({ data }: { data: AdminAnalytics }) {
  const max = Math.max(1, ...data.signupsByMonth.map((m) => m.count));
  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-ink-900">New customers / month</h2>
      <div className="mt-5 flex h-40 items-end gap-1.5">
        {data.signupsByMonth.map((m) => (
          <div key={m.month} className="group flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-medium text-ink-400 opacity-0 group-hover:opacity-100">
              {m.count}
            </span>
            <div
              className="w-full rounded-t bg-brand-400/80 transition group-hover:bg-brand-500"
              style={{ height: `${(m.count / max) * 100}%`, minHeight: m.count > 0 ? 4 : 0 }}
            />
            <span className="text-[9px] text-ink-300">{m.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CustomersTable({
  data,
  profitOf,
  onChanged,
}: {
  data: AdminAnalytics;
  profitOf: (c: BillingCompany) => { cost: number; profit: number };
  onChanged: () => void;
}) {
  // Highest-paying customers first.
  const rows = [...data.companies].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-ink-900">Customers</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3 text-right">Seats</th>
              <th className="px-4 py-3 text-right">MRR</th>
              <th className="px-4 py-3 text-right">Est. cost</th>
              <th className="px-4 py-3 text-right">Est. profit</th>
              <th className="px-4 py-3 text-right">Margin</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const { cost, profit } = profitOf(c);
              const margin = c.monthlyRevenue > 0 ? (profit / c.monthlyRevenue) * 100 : 0;
              return (
                <tr key={c.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-900">{c.name}</div>
                    <div className="text-xs text-ink-400">
                      {c.isActive ? (
                        <Badge tone="good">Active</Badge>
                      ) : (
                        <Badge tone="warn">{c.subscriptionStatus}</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.plan}
                    {c.monthlyPriceOverride != null && (
                      <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-medium text-brand-600">
                        custom
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-600">{c.seats}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">
                    {c.needsPricing ? (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <AlertTriangle size={12} /> set price
                      </span>
                    ) : (
                      `${usd2.format(c.monthlyRevenue)}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-500">{usd2.format(cost)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {usd2.format(profit)}
                  </td>
                  <td className="px-4 py-3 text-right text-ink-500">
                    {c.monthlyRevenue > 0 ? `${margin.toFixed(0)}%` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <PriceEditor company={c} onSaved={onChanged} />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-ink-500">
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PriceEditor({ company, onSaved }: { company: BillingCompany; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    company.monthlyPriceOverride != null ? String(company.monthlyPriceOverride) : "",
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);

  async function save(amount: number | null) {
    setBusy(true);
    setErr(false);
    try {
      await superAdminApi.setCompanyPricing(company.id, amount);
      setEditing(false);
      onSaved();
    } catch {
      setErr(true);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button
        className="btn-ghost text-xs"
        onClick={() => {
          setValue(company.monthlyPriceOverride != null ? String(company.monthlyPriceOverride) : "");
          setEditing(true);
        }}
        title="Set a custom monthly price"
      >
        <Pencil size={13} /> {company.monthlyPriceOverride != null ? "Edit price" : "Set price"}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-400">$</span>
        <input
          autoFocus
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="/mo"
          className={`input h-8 w-24 pl-5 text-sm ${err ? "border-red-400" : ""}`}
        />
      </div>
      <button
        className="btn-ghost p-1.5 text-green-600"
        title="Save"
        disabled={busy || value.trim() === ""}
        onClick={() => save(Math.max(0, Number(value)))}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      </button>
      {company.monthlyPriceOverride != null && (
        <button
          className="btn-ghost p-1.5 text-ink-400"
          title="Clear custom price (use plan pricing)"
          disabled={busy}
          onClick={() => save(null)}
        >
          ⟲
        </button>
      )}
      <button className="btn-ghost p-1.5" title="Cancel" onClick={() => setEditing(false)} disabled={busy}>
        <X size={14} />
      </button>
    </div>
  );
}
