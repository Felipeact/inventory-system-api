"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Check,
  CreditCard,
  ExternalLink,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PLANS } from "@/lib/plans";
import type { BillingStatus } from "@/lib/types";
import { PageHeader, Badge } from "@/components/app/ui";

/** Plans sold self-serve through Stripe (Enterprise is contact-sales). */
const SELF_SERVE = ["starter", "pro", "business"] as const;

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid place-items-center py-20">
          <Loader2 size={24} className="animate-spin text-ink-400" />
        </div>
      }
    >
      <BillingPageInner />
    </Suspense>
  );
}

function BillingPageInner() {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(PERMISSIONS.MANAGE_USERS);
  const params = useSearchParams();

  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const justSucceeded = params.get("status") === "success";
  const justCancelled = params.get("status") === "cancelled";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await api.billingStatus());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upgrade(plan: string) {
    setWorking(plan);
    setError(null);
    try {
      const { url } = await api.billingCheckout(plan);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start checkout.");
      setWorking(null);
    }
  }

  async function manage() {
    setWorking("portal");
    setError(null);
    try {
      const { url } = await api.billingPortal();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not open the billing portal.");
      setWorking(null);
    }
  }

  const currentPlan = (status?.plan ?? "").toUpperCase();

  return (
    <div>
      <PageHeader title="Billing & plan" description="Manage your subscription, seats, and invoices." />

      {justSucceeded && (
        <Banner tone="good">
          <Check size={16} /> Subscription updated — thanks! It may take a few seconds to reflect below.
        </Banner>
      )}
      {justCancelled && (
        <Banner tone="muted">Checkout was cancelled. No changes were made.</Banner>
      )}
      {status && !status.enabled && (
        <Banner tone="warn">
          <AlertCircle size={16} /> Billing isn&apos;t enabled yet. An admin needs to configure Stripe
          (<code className="font-mono">STRIPE_SECRET_KEY</code> and plan price IDs) on the API.
        </Banner>
      )}
      {error && <Banner tone="bad"><AlertCircle size={16} /> {error}</Banner>}

      {loading || !status ? (
        <div className="grid place-items-center py-20">
          <Loader2 size={24} className="animate-spin text-ink-400" />
        </div>
      ) : (
        <>
          {/* Current subscription */}
          <section className="card mb-8 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Current plan</p>
                <div className="mt-1 flex items-center gap-2">
                  <h2 className="text-xl font-bold text-ink-900">{currentPlan}</h2>
                  {status.subscriptionStatus === "ACTIVE" ? (
                    <Badge tone="good">Active</Badge>
                  ) : (
                    <Badge tone="warn">{status.subscriptionStatus}</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-500">
                  {status.seats} {status.seats === 1 ? "seat" : "seats"} in use
                  {status.currentPeriodEnd && (
                    <> · renews {new Date(status.currentPeriodEnd).toLocaleDateString()}</>
                  )}
                </p>
              </div>
              {isAdmin && status.manageable && (
                <button onClick={manage} className="btn-secondary" disabled={working !== null}>
                  {working === "portal" ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CreditCard size={16} />
                  )}
                  Manage billing
                </button>
              )}
            </div>
            {!isAdmin && (
              <p className="mt-4 text-xs text-ink-400">
                Only admins can change the plan or payment method.
              </p>
            )}
          </section>

          {/* Plans */}
          <div className="grid gap-5 md:grid-cols-3">
            {PLANS.filter((p) => SELF_SERVE.includes(p.id as (typeof SELF_SERVE)[number]) || p.id === "enterprise").map(
              (plan) => {
                const planKey = plan.id.toUpperCase();
                const isCurrent = currentPlan === planKey;
                const isEnterprise = plan.id === "enterprise";
                return (
                  <div
                    key={plan.id}
                    className={`card flex flex-col p-6 ${
                      plan.highlighted ? "ring-2 ring-brand-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-ink-900">{plan.name}</h3>
                      {plan.badge && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p>
                    <div className="mt-4">
                      {plan.priceMonthly == null ? (
                        <p className="text-2xl font-bold text-ink-900">Custom</p>
                      ) : (
                        <p className="text-2xl font-bold text-ink-900">
                          ${plan.priceMonthly}
                          <span className="text-sm font-normal text-ink-400"> /{plan.unit}</span>
                        </p>
                      )}
                    </div>
                    <ul className="mt-4 flex-1 space-y-2 text-sm text-ink-600">
                      {plan.included.slice(0, 5).map((f) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={15} className="mt-0.5 shrink-0 text-brand-500" /> {f}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      {isCurrent ? (
                        <button className="btn-secondary w-full" disabled>
                          Current plan
                        </button>
                      ) : isEnterprise ? (
                        <a href="/request-demo?plan=enterprise" className="btn-secondary w-full justify-center">
                          Contact sales <ExternalLink size={14} />
                        </a>
                      ) : (
                        <button
                          className="btn-primary w-full justify-center"
                          disabled={!isAdmin || !status.enabled || working !== null}
                          onClick={() => upgrade(planKey)}
                          title={!isAdmin ? "Admins only" : undefined}
                        >
                          {working === planKey ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          {status.hasSubscription ? "Switch to " + plan.name : "Upgrade to " + plan.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>

          <p className="mt-6 text-xs text-ink-400">
            Payments are processed securely by Stripe. You&apos;re billed per active user; changing
            seats prorates automatically. Manage your card, invoices, or cancel anytime from the
            billing portal.
          </p>
        </>
      )}
    </div>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "good" | "bad" | "warn" | "muted";
  children: React.ReactNode;
}) {
  const cls = {
    good: "border-green-200 bg-green-50 text-green-800",
    bad: "border-red-200 bg-red-50 text-red-700",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    muted: "border-ink-200 bg-ink-50 text-ink-600",
  }[tone];
  return (
    <div className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${cls}`}>
      {children}
    </div>
  );
}
