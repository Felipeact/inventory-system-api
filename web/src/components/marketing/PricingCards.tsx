"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { cn, formatCurrency } from "@/lib/utils";

export function PricingCards() {
  const [annual, setAnnual] = useState(true);

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm font-medium", !annual ? "text-ink-900" : "text-ink-400")}>
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual((v) => !v)}
          className={cn(
            "relative h-6 w-11 rounded-full transition",
            annual ? "bg-brand-600" : "bg-ink-300",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
              annual ? "left-[22px]" : "left-0.5",
            )}
          />
        </button>
        <span className={cn("text-sm font-medium", annual ? "text-ink-900" : "text-ink-400")}>
          Annual
        </span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
          Save ~20%
        </span>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const price = annual ? plan.priceAnnual : plan.priceMonthly;
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
