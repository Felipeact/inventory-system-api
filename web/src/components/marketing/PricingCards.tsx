"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { cn, formatCurrency } from "@/lib/utils";

export function PricingCards() {
  return (
    <div>
      <p className="text-center text-sm font-medium text-ink-500">
        One flat monthly price per plan — no per-seat math.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const price = plan.priceMonthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "card relative flex flex-col p-6",
                plan.highlighted &&
                  "border-brand-600 shadow-xl shadow-brand-600/10 ring-1 ring-brand-600",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-bold text-ink-900">{plan.name}</h3>
              <p className="mt-1 min-h-[2.5rem] text-sm text-ink-500">{plan.tagline}</p>

              <div className="mt-4">
                {price === null ? (
                  <p className="text-3xl font-extrabold tracking-tight text-ink-900">Custom</p>
                ) : price === 0 ? (
                  <p className="text-3xl font-extrabold tracking-tight text-ink-900">$0</p>
                ) : (
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold tracking-tight text-ink-900">
                      {formatCurrency(price)}
                    </span>
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-500">{plan.unit}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {plan.onboardingFee === null
                    ? "Custom onboarding"
                    : `+ ${formatCurrency(plan.onboardingFee)} one-time onboarding`}
                </p>
              </div>

              <Link
                href={plan.cta.href}
                className={cn(
                  "mt-6 w-full",
                  plan.highlighted ? "btn-primary" : "btn-secondary",
                )}
              >
                {plan.cta.label}
              </Link>

              <div className="mt-6 space-y-1 border-t border-ink-100 pt-5 text-xs font-medium text-ink-500">
                <p>{plan.limits.users}</p>
                <p>{plan.limits.products}</p>
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                What's included
              </p>
              <ul className="mt-3 space-y-2.5">
                {plan.included.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-ink-700">
                    <Check size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
