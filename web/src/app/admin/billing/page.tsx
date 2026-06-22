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
  TrendingDown,
  DollarSign,
  Percent,
  Building2,
  Users,
  Wallet,
  AlertTriangle,
  Check,
  Pencil,
  X,
} from "lucide-react";
import { superAdminApi, superAdminStore, ApiError } from "@/lib/api";
import type { AdminAnalytics, BillingCompany, RevenuePoint } from "@/lib/types";
import { Badge } from "@/components/app/ui";

/** Operating-cost assumptions, persisted per operator in localStorage. */
const COSTS_KEY = "sp_admin_pnl_costs";

interface Costs {
  /** Stripe processing fee, percent of revenue. */
  stripePct: number;
  /** Stripe per-charge fee (USD). */
  stripePerTxn: number;
  /** Fixed monthly provider bills (USD/mo). */
  railway: number;
  ai: number;
  email: number;
  storage: number;
  other: number;
}

const DEFAULT_COSTS: Costs = {
  stripePct: 2.9,
  stripePerTxn: 0.3,
  railway: 20,
  ai: 50,
  email: 20,
  storage: 5,
  other: 0,
};

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

function loadCosts(): Costs {
  if (typeof window === "undefined") return DEFAULT_COSTS;
  try {
    const raw = window.localStorage.getItem(COSTS_KEY);
    if (!raw) return DEFAULT_COSTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_COSTS, ...parsed };
  } catch {
    return DEFAULT_COSTS;
  }
}

export default function BillingDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costs, setCosts] = useState<Costs>(DEFAULT_COSTS);

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
    setCosts(loadCosts());
    setReady(true);
    void load();
  }, [router, load]);

  useEffect(() => {
    if (ready) window.localStorage.setItem(COSTS_KEY, JSON.stringify(costs));
  }, [costs, ready]);

  const setCost = (key: keyof Costs, value: number) =>
    setCosts((c) => ({ ...c, [key]: Math.max(0, value) }));

  /** Full monthly profit & loss computed from revenue + cost assumptions. */
  const pnl = useMemo(() => {
    if (!data) return null;
    const revenue = data.metrics.mrr;
    const stripeFees =
      revenue * (costs.stripePct / 100) + costs.stripePerTxn * data.metrics.payingCompanies;
    const fixed = costs.railway + costs.ai + costs.email + costs.storage + costs.other;
    const expenses = stripeFees + fixed;
    const net = revenue - expenses;
    return {
      revenue,
      stripeFees,
      fixed,
      expenses,
      net,
      annualNet: net * 12,
      margin: revenue > 0 ? (net / revenue) * 100 : 0,
      profitable: net >= 0,
    };
  }, [data, costs]);

  /** Per-company profit: its revenue − its Stripe fee − an equal share of fixed costs. */
  const profitOf = useCallback(
    (c: BillingCompany) => {
      const activeCount = Math.max(1, data?.metrics.activeCompanies ?? 1);
      const fixed = costs.railway + costs.ai + costs.email + costs.storage + costs.other;
      const stripe =
        c.monthlyRevenue * (costs.stripePct / 100) + (c.monthlyRevenue > 0 ? costs.stripePerTxn : 0);
      const cost = stripe + fixed / activeCount;
      return { cost, profit: c.monthlyRevenue - cost };
    },
    [data, costs],
  );

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Revenue &amp; profit</h1>
          <p className="mt-1 text-sm text-ink-500">
            Your monthly P&amp;L — recurring revenue minus what you spend on Stripe, hosting, AI,
            and other tools — so you can see if you&apos;re making or losing money.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        {loading || !data || !pnl ? (
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

            {/* Verdict + P&L */}
            <div className="grid gap-6 lg:grid-cols-3">
              <ProfitVerdict pnl={pnl} />
              <PnlStatement pnl={pnl} />
              <ExpenseEditor costs={costs} setCost={setCost} payingCompanies={data.metrics.payingCompanies} stripeFees={pnl.stripeFees} />
            </div>

            {/* KPIs */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={DollarSign} label="MRR" value={usd.format(pnl.revenue)} hint="Recurring revenue / mo" tone="brand" />
              <Kpi icon={TrendingUp} label="ARR" value={usd.format(data.metrics.arr)} hint="Annual run-rate" />
              <Kpi icon={Building2} label="Active customers" value={String(data.metrics.activeCompanies)} hint={`${data.metrics.totalCompanies} total`} />
              <Kpi icon={Users} label="Paid seats" value={String(data.metrics.activeSeats)} hint="Across active customers" />
            </div>

            <RevenueTrends data={data} />

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

type Pnl = {
  revenue: number;
  stripeFees: number;
  fixed: number;
  expenses: number;
  net: number;
  annualNet: number;
  margin: number;
  profitable: boolean;
};

/** Big headline: are you making or losing money this month? */
function ProfitVerdict({ pnl }: { pnl: Pnl }) {
  const good = pnl.profitable;
  return (
    <div className={`card flex flex-col justify-between p-6 ${good ? "ring-1 ring-green-200" : "ring-1 ring-red-200"}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
        {good ? <TrendingUp size={14} className="text-green-600" /> : <TrendingDown size={14} className="text-red-600" />}
        Net profit / month
      </div>
      <div>
        <p className={`mt-2 text-4xl font-extrabold tracking-tight ${good ? "text-green-600" : "text-red-600"}`}>
          {pnl.net < 0 ? `-${usd.format(Math.abs(pnl.net))}` : usd.format(pnl.net)}
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {good ? "Profitable" : "Operating at a loss"} · {pnl.margin.toFixed(0)}% margin
        </p>
      </div>
      <p className="mt-4 text-xs text-ink-400">
        {pnl.annualNet < 0
          ? `${usd.format(pnl.annualNet)} / yr at this rate`
          : `${usd.format(pnl.annualNet)} / yr projected`}
      </p>
    </div>
  );
}

/** Revenue − expenses = net, line by line. */
function PnlStatement({ pnl }: { pnl: Pnl }) {
  return (
    <div className="card p-6">
      <h2 className="text-base font-semibold text-ink-900">Monthly P&amp;L</h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        <Row label="Gross revenue (MRR)" value={usd2.format(pnl.revenue)} strong tone="good" />
        <Row label="− Stripe processing fees" value={`-${usd2.format(pnl.stripeFees)}`} />
        <Row label="− Fixed monthly costs" value={`-${usd2.format(pnl.fixed)}`} />
        <div className="!mt-3 border-t border-ink-100 pt-3">
          <Row
            label="= Net profit"
            value={pnl.net < 0 ? `-${usd2.format(Math.abs(pnl.net))}` : usd2.format(pnl.net)}
            strong
            tone={pnl.profitable ? "good" : "bad"}
          />
        </div>
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone = "default",
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "default" | "good" | "bad";
}) {
  const color = tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : "text-ink-700";
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={`${strong ? "font-bold" : "font-medium"} ${color}`}>{value}</dd>
    </div>
  );
}

/** Editable operating costs. Stripe fees are computed; fixed bills are entered. */
function ExpenseEditor({
  costs,
  setCost,
  payingCompanies,
  stripeFees,
}: {
  costs: Costs;
  setCost: (k: keyof Costs, v: number) => void;
  payingCompanies: number;
  stripeFees: number;
}) {
  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <Wallet size={16} className="text-brand-600" /> Operating expenses
      </h2>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ink-400">Stripe processing</p>
      <div className="mt-2 flex items-end gap-2">
        <PctField label="Fee %" value={costs.stripePct} onChange={(v) => setCost("stripePct", v)} />
        <MoneyField label="Per charge" value={costs.stripePerTxn} onChange={(v) => setCost("stripePerTxn", v)} step={0.05} />
      </div>
      <p className="mt-1.5 text-xs text-ink-400">
        ≈ {usd2.format(stripeFees)}/mo on current revenue ({payingCompanies} charges)
      </p>

      <p className="mt-4 text-xs font-medium uppercase tracking-wide text-ink-400">Fixed monthly bills</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <MoneyField label="Railway / hosting" value={costs.railway} onChange={(v) => setCost("railway", v)} />
        <MoneyField label="AI (Anthropic)" value={costs.ai} onChange={(v) => setCost("ai", v)} />
        <MoneyField label="Email" value={costs.email} onChange={(v) => setCost("email", v)} />
        <MoneyField label="Storage" value={costs.storage} onChange={(v) => setCost("storage", v)} />
        <MoneyField label="Other" value={costs.other} onChange={(v) => setCost("other", v)} />
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-400">$</span>
        <input
          type="number"
          min={0}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input h-9 w-full pl-5 text-sm"
        />
      </div>
    </div>
  );
}

function PctField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="label text-xs">{label}</label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={0.1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input h-9 w-20 pr-6 text-sm"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400">%</span>
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

/** Short label for a "YYYY-MM" key, e.g. "Jan" (or "Jan '26" for January). */
function fmtMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const name = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" });
  return m === 1 ? `${name} '${String(y).slice(2)}` : name;
}

type TimeView = "past" | "present" | "future";
type Granularity = "month" | "year";

/**
 * Revenue over time with past / present / future and monthly / yearly filters.
 * Past trend comes from the analytics series; future is a straight-line projection
 * from current MRR using an editable net-new MRR/month assumption.
 */
function RevenueTrends({ data }: { data: AdminAnalytics }) {
  const [view, setView] = useState<TimeView>("present");
  const [grain, setGrain] = useState<Granularity>("month");
  const [range, setRange] = useState<number>(12); // months of history to show

  const series = data.revenueByMonth ?? [];
  const currentMrr = data.metrics.mrr;

  // Default future growth = average net-new MRR over the last 3 months.
  const recentGrowth = useMemo(() => {
    const tail = series.slice(-3);
    if (tail.length === 0) return 0;
    return Math.round(tail.reduce((s, p) => s + p.newMrr, 0) / tail.length);
  }, [series]);
  const [growth, setGrowth] = useState<number | null>(null);
  const growthPerMonth = growth ?? recentGrowth;

  // ---- Build the bar series for the chosen view + granularity ----
  const bars = useMemo<{ label: string; value: number; sub?: number }[]>(() => {
    if (view === "future") {
      const periods = grain === "month" ? 12 : 3;
      const now = new Date();
      return Array.from({ length: periods }, (_, i) => {
        const stepMonths = grain === "month" ? i + 1 : (i + 1) * 12;
        const projected = currentMrr + growthPerMonth * stepMonths;
        const d = new Date(now.getFullYear(), now.getMonth() + (grain === "month" ? i + 1 : 0), 1);
        const label =
          grain === "month"
            ? fmtMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
            : `${now.getFullYear() + i + 1}`;
        return { label, value: Math.max(0, projected) };
      });
    }

    // Past (and present uses the same trend, just highlighting "now").
    if (grain === "year") {
      const byYear = new Map<string, RevenuePoint[]>();
      for (const p of series) {
        const y = p.month.slice(0, 4);
        (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(p);
      }
      return Array.from(byYear.entries()).map(([year, pts]) => ({
        label: year,
        value: pts[pts.length - 1]?.cumulativeMrr ?? 0, // MRR at year end
        sub: pts.reduce((s, p) => s + p.newMrr, 0), // new MRR added that year
      }));
    }

    const sliced = series.slice(Math.max(0, series.length - range));
    return sliced.map((p) => ({ label: fmtMonth(p.month), value: p.cumulativeMrr, sub: p.newMrr }));
  }, [view, grain, range, series, currentMrr, growthPerMonth]);

  const max = Math.max(1, ...bars.map((b) => b.value));

  // ---- Headline numbers per view ----
  const firstPast = series.slice(Math.max(0, series.length - range))[0]?.cumulativeMrr ?? 0;
  const pastDelta = currentMrr - firstPast;
  const pastPct = firstPast > 0 ? (pastDelta / firstPast) * 100 : 0;
  const futureMrr = currentMrr + growthPerMonth * (grain === "month" ? 12 : 36);

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-900">Revenue over time</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            {view === "present"
              ? "Where you are right now."
              : view === "past"
                ? "Estimated from signup dates and current pricing."
                : `Projected at ${usd.format(growthPerMonth)}/mo net-new MRR.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Seg
            options={[
              { v: "past", label: "Past" },
              { v: "present", label: "Present" },
              { v: "future", label: "Future" },
            ]}
            value={view}
            onChange={(v) => setView(v as TimeView)}
          />
          <Seg
            options={[
              { v: "month", label: "Monthly" },
              { v: "year", label: "Yearly" },
            ]}
            value={grain}
            onChange={(v) => setGrain(v as Granularity)}
          />
        </div>
      </div>

      {/* Present: a clean snapshot */}
      {view === "present" && (
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Snapshot label="MRR (now)" value={usd.format(currentMrr)} tone="brand" />
          <Snapshot label="ARR run-rate" value={usd.format(currentMrr * 12)} />
          <Snapshot
            label="Last 30d net-new"
            value={`${recentGrowth >= 0 ? "+" : ""}${usd.format(recentGrowth)}`}
            tone={recentGrowth >= 0 ? "good" : "bad"}
          />
        </div>
      )}

      {/* Past: range picker + trend */}
      {view === "past" && grain === "month" && (
        <div className="mt-4 flex items-center gap-2">
          {[6, 12, 24].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                range === r ? "bg-brand-100 text-brand-700" : "text-ink-500 hover:bg-ink-50"
              }`}
            >
              {r}m
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-500">
            {pastDelta >= 0 ? "▲" : "▼"} {usd.format(Math.abs(pastDelta))} ({pastPct >= 0 ? "+" : ""}
            {pastPct.toFixed(0)}%) over {range}m
          </span>
        </div>
      )}

      {/* Future: editable growth assumption */}
      {view === "future" && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-xs text-ink-500">Net-new MRR / month</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-400">$</span>
            <input
              type="number"
              step={50}
              value={growthPerMonth}
              onChange={(e) => setGrowth(Number(e.target.value))}
              className="input h-8 w-28 pl-5 text-sm"
            />
          </div>
          <span className="ml-auto text-xs text-ink-500">
            → {usd.format(futureMrr)} MRR in {grain === "month" ? "12 months" : "3 years"} (
            {usd.format(futureMrr * 12)} ARR)
          </span>
        </div>
      )}

      {/* Bar chart (past + future) */}
      {view !== "present" && (
        <div className="mt-5 flex h-44 items-end gap-1.5">
          {bars.map((b, i) => (
            <div key={`${b.label}-${i}`} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] font-medium text-ink-500 opacity-0 group-hover:opacity-100">
                {usd.format(b.value)}
              </span>
              <div
                className={`w-full rounded-t transition ${
                  view === "future" ? "bg-brand-300/70 group-hover:bg-brand-400" : "bg-brand-400/80 group-hover:bg-brand-500"
                }`}
                style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 4 : 0 }}
              />
              <span className="text-[9px] text-ink-300">{b.label}</span>
            </div>
          ))}
          {bars.length === 0 && (
            <p className="grid w-full place-items-center text-sm text-ink-400">No data for this range yet.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** A segmented toggle. */
function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-ink-200 p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            value === o.v ? "bg-brand-600 text-white" : "text-ink-500 hover:text-ink-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Snapshot({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "brand" | "good" | "bad" }) {
  const color =
    tone === "brand" ? "text-brand-700" : tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : "text-ink-900";
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
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
  const rows = [...data.companies].sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-ink-900">Customers</h2>
      <p className="mb-3 text-xs text-ink-400">
        Profit per customer includes its Stripe fee plus an equal share of your fixed monthly costs.
      </p>
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
                    {profit < 0 ? `-${usd2.format(Math.abs(profit))}` : usd2.format(profit)}
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
