"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { api, ApiError } from "@/lib/api";

const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "500+"];
const TRADES = [
  "HVAC",
  "Plumbing",
  "Electrical",
  "Mechanical",
  "Refrigeration",
  "Multi-trade",
  "Other",
];
const FLEET = ["1–5 trucks", "6–20 trucks", "21–50 trucks", "50+ trucks"];

export function DemoForm({ defaultPlan }: { defaultPlan?: string }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.firstName || !data.email || !data.company) {
      setError("Please fill in your name, work email, and company.");
      return;
    }

    setStatus("submitting");
    try {
      // Posts to the API's public /leads endpoint, which emails the platform owner.
      await api.submitLead(data);
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong. Please email " + BRAND.salesEmail,
      );
    }
  }

  if (status === "done") {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-ink-900">Thanks — you're on the list!</h3>
        <p className="mt-2 text-ink-600">
          A product specialist will reach out within one business day to schedule your
          personalized demo. Need a hand sooner? Email{" "}
          <a href={`mailto:${BRAND.salesEmail}`} className="font-medium text-brand-600">
            {BRAND.salesEmail}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 sm:p-8">
      {defaultPlan && <input type="hidden" name="plan" defaultValue={defaultPlan} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="firstName">
            First name *
          </label>
          <input className="input" id="firstName" name="firstName" autoComplete="given-name" />
        </div>
        <div>
          <label className="label" htmlFor="lastName">
            Last name
          </label>
          <input className="input" id="lastName" name="lastName" autoComplete="family-name" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Work email *
          </label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="phone">
            Phone
          </label>
          <input className="input" id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="company">
            Company *
          </label>
          <input className="input" id="company" name="company" autoComplete="organization" />
        </div>
        <div>
          <label className="label" htmlFor="companySize">
            Company size
          </label>
          <select className="input" id="companySize" name="companySize" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {COMPANY_SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="trade">
            Trade
          </label>
          <select className="input" id="trade" name="trade" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {TRADES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fleet">
            Fleet size
          </label>
          <select className="input" id="fleet" name="fleet" defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {FLEET.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="message">
          What are you hoping to solve?
        </label>
        <textarea
          className="input min-h-[96px] resize-y"
          id="message"
          name="message"
          placeholder="e.g. We lose track of parts on 18 trucks and want to standardize stock per trade."
        />
      </div>

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary mt-6 w-full py-3 text-base"
      >
        {status === "submitting" ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Submitting…
          </>
        ) : (
          "Request my demo"
        )}
      </button>
      <p className="mt-3 text-center text-xs text-ink-400">
        By submitting, you agree to be contacted about {BRAND.name}. We never share your data.
      </p>
    </form>
  );
}
