"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  LogOut,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Ban,
  Building2,
  KeyRound,
  LineChart,
  DollarSign,
  Users,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { superAdminApi, superAdminStore, ApiError, API_BASE_URL } from "@/lib/api";
import type { ActivationCode, AdminCompany, AdminAnalytics } from "@/lib/types";
import { PLAN_LIMITS, formatLimit } from "@/lib/plans";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
import { Badge } from "@/components/app/ui";

const PLANS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"];

/** Random, readable activation code like ABCD-1234-EFGH. */
function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${block()}-${block()}-${block()}`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, co, an] = await Promise.all([
        superAdminApi.listCodes(),
        superAdminApi.listCompanies(),
        superAdminApi.analytics(),
      ]);
      setCodes(c);
      setCompanies(co);
      setAnalytics(an);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/admin/login");
        return;
      }
      setError(err instanceof ApiError ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!superAdminStore.token()) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
    void load();
  }, [router, load]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 size={26} className="animate-spin text-brand-600" />
      </div>
    );
  }

  function logout() {
    superAdminApi.logout();
    router.replace("/admin/login");
  }

  return (
    <div>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-100 bg-white/80 px-5 backdrop-blur sm:px-8">
        <div className="flex items-center gap-2 font-semibold text-ink-900">
          <ShieldCheck size={20} className="text-brand-600" /> Platform Admin
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/quotes" className="btn-ghost text-sm">
            <FileText size={16} /> Quotes
          </Link>
          <Link href="/admin/billing" className="btn-ghost text-sm">
            <LineChart size={16} /> Revenue
          </Link>
          <button onClick={load} className="btn-ghost p-2" title="Refresh" aria-label="Refresh">
            <RefreshCw size={18} />
          </button>
          <button onClick={logout} className="btn-secondary">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 p-5 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Operator console</h1>
          <p className="mt-1 text-sm text-ink-500">
            Issue activation codes so companies can register, and manage tenants. API:{" "}
            <code className="font-mono text-xs">{API_BASE_URL}</code>
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi
            icon={Building2}
            label="Companies"
            value={String(analytics?.metrics.totalCompanies ?? companies.length)}
            hint={`${analytics?.metrics.activeCompanies ?? companies.filter((c) => c.subscriptionStatus === "ACTIVE").length} active`}
          />
          <Kpi
            icon={Users}
            label="Paid seats"
            value={String(analytics?.metrics.activeSeats ?? "—")}
            hint="across active customers"
          />
          <Kpi
            icon={DollarSign}
            label="MRR"
            value={analytics ? usd.format(analytics.metrics.mrr) : "—"}
            hint={analytics ? `${usd.format(analytics.metrics.arr)} ARR` : undefined}
            tone="brand"
          />
          <Kpi
            icon={KeyRound}
            label="Codes available"
            value={String(codes.filter((c) => !c.isUsed && c.isActive).length)}
            hint={`${codes.length} total`}
          />
        </div>

        <CreateCodeCard onCreated={load} />

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink-900">
            <KeyRound size={18} className="text-brand-600" /> Activation codes
          </h2>
          {loading ? (
            <Loader2 className="animate-spin text-ink-400" />
          ) : (
            <CodesTable codes={codes} onChanged={load} />
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink-900">
            <Building2 size={18} className="text-brand-600" /> Companies
          </h2>
          {loading ? (
            <Loader2 className="animate-spin text-ink-400" />
          ) : (
            <CompaniesTable companies={companies} onChanged={load} />
          )}
        </section>
      </main>
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
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-400">
        <Icon size={14} /> {label}
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${tone === "brand" ? "text-brand-700" : "text-ink-900"}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

function CreateCodeCard({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState(randomCode());
  const [plan, setPlan] = useState("STARTER");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  // Limits + AI follow the chosen plan automatically (single source of truth).
  const limits = PLAN_LIMITS[plan];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreated(null);
    setBusy(true);
    try {
      await superAdminApi.createCode({ code: code.trim(), plan });
      setCreated(code.trim());
      setCode(randomCode());
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not create code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="text-base font-semibold text-ink-900">Create an activation code</h2>
      <p className="mt-1 text-sm text-ink-500">
        Pick a plan — the user and product limits are set automatically. Share the code
        so a company can register at <code className="font-mono text-xs">/register</code>.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="label">Code</label>
          <div className="flex gap-2">
            <input className="input font-mono" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button type="button" className="btn-secondary shrink-0" onClick={() => setCode(randomCode())} title="Generate">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div>
          <label className="label">Plan</label>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value)}>
            {PLANS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Limits (auto)</label>
          <div className="input flex h-[42px] items-center bg-ink-50 text-sm text-ink-600">
            {limits
              ? `${formatLimit(limits.maxUsers)} users · ${formatLimit(limits.maxProducts)} products · AI ${limits.ai ? "✓" : "✕"}`
              : "—"}
          </div>
        </div>

        {err && <p className="sm:col-span-2 lg:col-span-4 text-sm font-medium text-red-600">{err}</p>}
        {created && (
          <p className="sm:col-span-2 lg:col-span-4 flex items-center gap-1.5 text-sm font-medium text-green-600">
            <Check size={15} /> Created code <span className="font-mono">{created}</span> — use it on the Register page.
          </p>
        )}

        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create code
          </button>
        </div>
      </form>
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost p-1.5"
      title="Copy code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
    </button>
  );
}

function CodesTable({ codes, onChanged }: { codes: ActivationCode[]; onChanged: () => void }) {
  if (codes.length === 0) {
    return <p className="card p-6 text-sm text-ink-500">No activation codes yet. Create one above.</p>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Limits</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {codes.map((c) => (
            <tr key={c.id} className="border-b border-ink-50 last:border-0">
              <td className="px-4 py-3 font-mono font-medium text-ink-900">
                <span className="inline-flex items-center gap-1">{c.code} <CopyButton value={c.code} /></span>
              </td>
              <td className="px-4 py-3">{c.plan}</td>
              <td className="px-4 py-3 text-ink-500">{c.maxUsers} users · {c.maxProducts} products</td>
              <td className="px-4 py-3">
                {c.isUsed ? (
                  <Badge tone="muted">Used</Badge>
                ) : c.isActive ? (
                  <Badge tone="good">Available</Badge>
                ) : (
                  <Badge tone="warn">Disabled</Badge>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {!c.isUsed && c.isActive && (
                  <button
                    className="btn-ghost p-1.5 text-red-600"
                    title="Disable code"
                    onClick={async () => {
                      await superAdminApi.deactivateCode(c.id);
                      onChanged();
                    }}
                  >
                    <Ban size={15} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompaniesTable({ companies, onChanged }: { companies: AdminCompany[]; onChanged: () => void }) {
  if (companies.length === 0) {
    return <p className="card p-6 text-sm text-ink-500">No companies have registered yet.</p>;
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Seats</th>
            <th className="px-4 py-3">Joined</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((co) => {
            const active = co.subscriptionStatus === "ACTIVE";
            const seats = co.users?.length ?? 0;
            const atCap = co.maxUsers > 0 && seats >= co.maxUsers && co.maxUsers < 1_000_000;
            return (
              <tr key={co.id} className="border-b border-ink-50 last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{co.name}</div>
                  <div className="text-xs text-ink-400">
                    {PLAN_LIMITS[co.plan]?.ai ? "AI included" : "No AI"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PlanSelect company={co} onChanged={onChanged} />
                </td>
                <td className="px-4 py-3 text-ink-600">
                  <span className={atCap ? "font-medium text-amber-600" : ""}>
                    {seats} / {formatLimit(co.maxUsers)}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {co.createdAt ? new Date(co.createdAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  {active ? <Badge tone="good">Active</Badge> : <Badge tone="warn">Inactive</Badge>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    className="btn-ghost text-xs"
                    onClick={async () => {
                      if (active) await superAdminApi.deactivateCompany(co.id);
                      else await superAdminApi.activateCompany(co.id);
                      onChanged();
                    }}
                  >
                    {active ? "Suspend" : "Activate"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Inline plan changer — choosing a plan auto-applies its user/product limits + AI. */
function PlanSelect({ company, onChanged }: { company: AdminCompany; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <select
        className="input h-9 w-32 text-sm"
        value={company.plan}
        disabled={busy}
        onChange={async (e) => {
          const plan = e.target.value;
          if (plan === company.plan) return;
          setBusy(true);
          try {
            await superAdminApi.updateCompanyPlan(company.id, plan);
            onChanged();
          } catch {
            /* surfaced on next load */
          } finally {
            setBusy(false);
          }
        }}
      >
        {PLANS.map((p) => (
          <option key={p}>{p}</option>
        ))}
      </select>
      {busy && <Loader2 size={14} className="animate-spin text-ink-400" />}
    </div>
  );
}
