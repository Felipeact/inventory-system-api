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
  ExternalLink,
  Ban,
} from "lucide-react";
import { superAdminApi, superAdminStore, ApiError } from "@/lib/api";
import type { AdminCompany, AdminQuote, CreateQuoteResult } from "@/lib/types";
import { Badge } from "@/components/app/ui";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default function QuotesPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!superAdminStore.token()) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
    superAdminApi
      .listCompanies()
      .then(setCompanies)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/admin/login");
        else setError(e instanceof ApiError ? e.message : "Failed to load companies.");
      });
  }, [router]);

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

      <main className="mx-auto max-w-4xl space-y-8 p-5 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Custom quotes &amp; billing</h1>
          <p className="mt-1 text-sm text-ink-500">
            Charge a specific client a custom amount on a recurring schedule (monthly or
            biweekly) via Stripe. A payable invoice link is generated to send to the client.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}

        <QuoteBuilder companies={companies} />
      </main>
    </div>
  );
}

function QuoteBuilder({ companies }: { companies: AdminCompany[] }) {
  const [companyId, setCompanyId] = useState("");
  const [amount, setAmount] = useState(150);
  const [interval, setInterval] = useState<"monthly" | "biweekly">("monthly");
  const [label, setLabel] = useState("Custom plan");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateQuoteResult | null>(null);

  const [quotes, setQuotes] = useState<AdminQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const loadQuotes = useCallback(async (id: string) => {
    if (!id) {
      setQuotes([]);
      return;
    }
    setLoadingQuotes(true);
    try {
      setQuotes(await superAdminApi.listQuotes(id));
    } catch {
      setQuotes([]);
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  useEffect(() => {
    void loadQuotes(companyId);
  }, [companyId, loadQuotes]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreated(null);
    if (!companyId) {
      setErr("Choose a company first.");
      return;
    }
    setBusy(true);
    try {
      const result = await superAdminApi.createQuote(companyId, { amount, interval, label });
      setCreated(result);
      await loadQuotes(companyId);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not create the quote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
          <FileText size={18} className="text-brand-600" /> New quote
        </h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Company</label>
            <select
              className="input"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Select a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.plan})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount (USD)</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
              <input
                type="number"
                min={1}
                step={1}
                className="input pl-7"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
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
            <label className="label">Description (shown on the invoice)</label>
            <input
              className="input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Enterprise — 40 technicians"
            />
          </div>

          {err && <p className="sm:col-span-2 text-sm font-medium text-red-600">{err}</p>}

          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create &amp; bill {usd.format(amount || 0)} / {interval === "monthly" ? "month" : "2 weeks"}
            </button>
          </div>
        </form>

        {created && (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-green-700">
              <Check size={15} /> Quote created — {usd.format(created.amount)} billed{" "}
              {created.interval}.
            </p>
            {created.hostedInvoiceUrl && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href={created.hostedInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Open invoice <ExternalLink size={13} />
                </a>
                <CopyLink url={created.hostedInvoiceUrl} />
                <span className="text-xs text-ink-500">Send this link to the client to pay.</span>
              </div>
            )}
          </div>
        )}
      </section>

      {companyId && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink-900">Active charges for this company</h2>
          {loadingQuotes ? (
            <Loader2 className="animate-spin text-ink-400" />
          ) : quotes.length === 0 ? (
            <p className="card p-6 text-sm text-ink-500">No custom charges yet.</p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right" />
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => (
                    <tr key={q.id} className="border-b border-ink-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-ink-900">{q.label}</td>
                      <td className="px-4 py-3">{usd.format(q.amount)}</td>
                      <td className="px-4 py-3 capitalize text-ink-600">{q.interval}</td>
                      <td className="px-4 py-3">
                        {q.status === "active" || q.status === "trialing" ? (
                          <Badge tone="good">{q.status}</Badge>
                        ) : (
                          <Badge tone="muted">{q.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {q.status !== "canceled" && (
                          <button
                            className="btn-ghost p-1.5 text-red-600"
                            title="Cancel this charge"
                            onClick={async () => {
                              await superAdminApi.cancelQuote(q.id);
                              await loadQuotes(companyId);
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
          )}
        </section>
      )}
    </>
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
