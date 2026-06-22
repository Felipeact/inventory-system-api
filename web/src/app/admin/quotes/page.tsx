"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  FileText,
  Plus,
  Check,
  Copy,
  Send,
  Mail,
  Ban,
  Trash2,
  KeyRound,
} from "lucide-react";
import { superAdminApi, superAdminStore, ApiError } from "@/lib/api";
import type { Deal } from "@/lib/types";
import { PLAN_LIMITS } from "@/lib/plans";
import { Badge } from "@/components/app/ui";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const PLAN_OPTIONS = ["STARTER", "PRO", "BUSINESS", "ENTERPRISE"] as const;

export default function QuotesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDeals(await superAdminApi.listDeals());
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/admin/login");
      else setError(e instanceof ApiError ? e.message : "Failed to load quotes.");
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

      <main className="mx-auto max-w-5xl space-y-8 p-5 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Quotes &amp; sales pipeline</h1>
          <p className="mt-1 text-sm text-ink-500">
            Quote a new prospect (type their company name — they don&apos;t need an account yet).
            Send a pay link; once they pay, an activation code is issued automatically and — when
            there&apos;s no setup fee — emailed with a registration link.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        <NewQuote onCreated={load} />

        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Pipeline</h2>
          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="animate-spin text-ink-400" />
            </div>
          ) : deals.length === 0 ? (
            <p className="card p-6 text-sm text-ink-500">No quotes yet — create one above.</p>
          ) : (
            <PipelineTable deals={deals} onChange={load} />
          )}
        </section>
      </main>
    </div>
  );
}

function NewQuote({ onCreated }: { onCreated: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [plan, setPlan] = useState<(typeof PLAN_OPTIONS)[number]>("PRO");
  const [seats, setSeats] = useState(5);
  const [interval, setInterval] = useState<"monthly" | "biweekly">("monthly");
  const [description, setDescription] = useState("");
  const [setupFee, setSetupFee] = useState<number>(PLAN_LIMITS.PRO.onboardingFee ?? 0);
  const [setupLabel, setSetupLabel] = useState("Setup & onboarding");
  const [amountOverride, setAmountOverride] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const planPrice = PLAN_LIMITS[plan]?.priceMonthly ?? null;
  const computed = planPrice; // flat monthly price for the plan
  const effectiveAmount = amountOverride !== "" ? Number(amountOverride) : computed;

  // When the operator switches plans, suggest that plan's onboarding fee and re-derive price.
  function choosePlan(next: (typeof PLAN_OPTIONS)[number]) {
    setPlan(next);
    setSetupFee(PLAN_LIMITS[next]?.onboardingFee ?? 0);
    setAmountOverride("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!companyName.trim()) return setErr("Enter the prospect's company name.");
    if (!contactEmail.trim()) return setErr("Enter a contact email.");
    if (planPrice == null && amountOverride === "") {
      return setErr("Enterprise is custom-priced — enter a monthly amount.");
    }
    setBusy(true);
    try {
      await superAdminApi.createDeal({
        companyName: companyName.trim(),
        contactEmail: contactEmail.trim(),
        plan,
        seats,
        interval,
        amount: amountOverride !== "" ? Number(amountOverride) : undefined,
        description: description.trim() || undefined,
        setupFee: setupFee > 0 ? setupFee : undefined,
        setupLabel: setupFee > 0 ? setupLabel : undefined,
      });
      setCompanyName("");
      setContactEmail("");
      setDescription("");
      setAmountOverride("");
      onCreated();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not create the quote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <FileText size={18} className="text-brand-600" /> New quote
      </h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Company name</label>
          <input
            className="input"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Cascade HVAC"
            required
          />
        </div>
        <div>
          <label className="label">Contact email</label>
          <input
            type="email"
            className="input"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="owner@cascadehvac.com"
            required
          />
        </div>

        <div>
          <label className="label">Plan</label>
          <select
            className="input"
            value={plan}
            onChange={(e) => choosePlan(e.target.value as (typeof PLAN_OPTIONS)[number])}
          >
            {PLAN_OPTIONS.map((p) => {
              const price = PLAN_LIMITS[p]?.priceMonthly;
              return (
                <option key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                  {price != null ? ` — ${usd.format(price)}/mo` : " — custom"}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="label">Seats</label>
          <input
            type="number"
            min={1}
            className="input"
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Number(e.target.value)))}
          />
        </div>

        <div>
          <label className="label">
            Monthly amount{" "}
            {planPrice != null && amountOverride === "" && <span className="text-ink-400">(auto)</span>}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
            <input
              type="number"
              min={1}
              className="input pl-7"
              value={amountOverride !== "" ? amountOverride : computed ?? ""}
              onChange={(e) => setAmountOverride(e.target.value)}
              placeholder={planPrice == null ? "Enter amount" : undefined}
            />
          </div>
          {planPrice != null && (
            <p className="mt-1 text-xs text-ink-400">
              Flat {usd.format(planPrice)}/mo for this plan. Edit to override.
            </p>
          )}
        </div>
        <div>
          <label className="label">Billing schedule</label>
          <select
            className="input"
            value={interval}
            onChange={(e) => setInterval(e.target.value as "monthly" | "biweekly")}
          >
            <option value="monthly">Monthly</option>
            <option value="biweekly">Biweekly (every 2 weeks)</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Description (shown on the invoice &amp; email, optional)</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Pro plan — 5 technicians"
          />
        </div>

        <div>
          <label className="label">One-time setup fee (optional)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
            <input
              type="number"
              min={0}
              className="input pl-7"
              value={setupFee}
              onChange={(e) => setSetupFee(Math.max(0, Number(e.target.value)))}
            />
          </div>
          <p className="mt-1 text-xs text-ink-400">
            If set, the code is issued on payment but <strong>not</strong> auto-emailed — you send it after onboarding.
          </p>
        </div>
        <div>
          <label className="label">Setup fee label</label>
          <input
            className="input"
            value={setupLabel}
            onChange={(e) => setSetupLabel(e.target.value)}
            disabled={setupFee <= 0}
          />
        </div>

        {err && <p className="sm:col-span-2 text-sm font-medium text-red-600">{err}</p>}

        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create quote
            {effectiveAmount ? ` — ${usd.format(effectiveAmount)}/${interval === "monthly" ? "mo" : "2 wks"}` : ""}
            {setupFee > 0 ? ` + ${usd.format(setupFee)} setup` : ""}
          </button>
          <p className="mt-2 text-xs text-ink-500">
            Saved as a draft. Click <strong>Send</strong> in the pipeline to generate the pay link and email it.
          </p>
        </div>
      </form>
    </section>
  );
}

const STATUS_META: Record<Deal["status"], { label: string; tone: "good" | "warn" | "muted" | "brand" | "default" }> = {
  DRAFT: { label: "Draft", tone: "muted" },
  SENT: { label: "Awaiting payment", tone: "warn" },
  PAID: { label: "Paid", tone: "good" },
  CODE_ISSUED: { label: "Code issued", tone: "good" },
  REGISTERED: { label: "Registered", tone: "brand" },
  DECLINED: { label: "Declined", tone: "default" },
  EXPIRED: { label: "Expired", tone: "muted" },
};

function PipelineTable({ deals, onChange }: { deals: Deal[]; onChange: () => void }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {deals.map((d) => (
            <DealRow key={d.id} deal={d} onChange={onChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DealRow({ deal, onChange }: { deal: Deal; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const meta = STATUS_META[deal.status] ?? STATUS_META.DRAFT;

  const run = useCallback(
    async (key: string, fn: () => Promise<unknown>) => {
      setBusy(key);
      try {
        await fn();
        onChange();
      } catch {
        /* surfaced on reload; keep the row responsive */
      } finally {
        setBusy(null);
      }
    },
    [onChange],
  );

  const every = deal.interval === "biweekly" ? "/2wks" : "/mo";

  return (
    <tr className="border-b border-ink-50 align-top last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-ink-900">{deal.companyName}</p>
        <p className="text-xs text-ink-400">{deal.contactEmail}</p>
        {deal.activationCode && (
          <p className="mt-1 inline-flex items-center gap-1 rounded bg-ink-50 px-1.5 py-0.5 font-mono text-xs text-ink-700">
            <KeyRound size={11} /> {deal.activationCode}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-ink-600">{deal.plan}</td>
      <td className="px-4 py-3 text-ink-700">
        {usd.format(deal.amount)}
        <span className="text-ink-400">{every}</span>
        {deal.setupFee > 0 && (
          <span className="block text-xs text-ink-400">+ {usd.format(deal.setupFee)} setup</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        {deal.status === "CODE_ISSUED" && (
          <span className="mt-1 block text-xs text-ink-400">
            {deal.codeEmailedAt ? "Code emailed" : "Not emailed yet"}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {deal.status === "DRAFT" && (
            <>
              <button
                className="btn-primary px-2.5 py-1 text-xs"
                disabled={busy !== null}
                onClick={() => run("send", () => superAdminApi.sendDeal(deal.id))}
              >
                {busy === "send" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
              </button>
              <button
                className="btn-ghost p-1.5 text-red-600"
                title="Delete draft"
                disabled={busy !== null}
                onClick={() => run("del", () => superAdminApi.removeDeal(deal.id))}
              >
                <Trash2 size={14} />
              </button>
            </>
          )}

          {deal.status === "SENT" && (
            <>
              {deal.checkoutUrl && <CopyLink url={deal.checkoutUrl} />}
              <button
                className="btn-ghost p-1.5 text-red-600"
                title="Decline / cancel"
                disabled={busy !== null}
                onClick={() => run("decline", () => superAdminApi.declineDeal(deal.id))}
              >
                <Ban size={14} />
              </button>
            </>
          )}

          {deal.status === "CODE_ISSUED" && (
            <button
              className="btn-secondary px-2.5 py-1 text-xs"
              disabled={busy !== null}
              onClick={() => run("email", () => superAdminApi.emailDealCode(deal.id))}
            >
              {busy === "email" ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
              {deal.codeEmailedAt ? "Resend code" : "Email code"}
            </button>
          )}

          {deal.status === "REGISTERED" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
              <Check size={13} /> Onboarded
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-ghost text-xs"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
