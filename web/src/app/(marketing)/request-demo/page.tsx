import type { Metadata } from "next";
import { Check, Star } from "lucide-react";
import { DemoForm } from "@/components/marketing/DemoForm";

export const metadata: Metadata = {
  title: "Request a demo",
  description:
    "Get a personalized 30-minute demo of Stockvio set up for your trade and fleet. See real-time inventory and truck-stock management in action.",
};

const BENEFITS = [
  "A guided walkthrough tailored to your trade and fleet size",
  "Truck-stock templates pre-built with sample parts",
  "See the technician mobile app and receipt reconciliation live",
  "Straight answers on pricing, rollout, and migration",
];

const STATS = [
  { value: "98%", label: "Inventory accuracy" },
  { value: "6 hrs", label: "Saved / tech / week" },
  { value: "< 1 day", label: "Time to go live" },
];

export default async function RequestDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; trade?: string }>;
}) {
  const { plan } = await searchParams;
  return (
    <section className="relative overflow-hidden py-16 lg:py-24">
      <div className="pointer-events-none absolute -top-24 right-0 -z-10 h-80 w-[600px] rounded-full bg-brand-200/40 blur-3xl" />
      <div className="container-page grid items-start gap-12 lg:grid-cols-2">
        {/* Left: value props + social proof */}
        <div>
          <p className="eyebrow">Request a personal demo</p>
          <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            See Stockvio running on trucks like yours
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600">
            No slideshow. A product specialist sets up Stockvio with sample data for your
            trade, then walks you through the exact workflow your crew would use.
          </p>

          <ul className="mt-8 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
                  <Check size={13} />
                </span>
                <span className="text-ink-700">{b}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 grid grid-cols-3 gap-4 border-y border-ink-100 py-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold tracking-tight text-ink-900">{s.value}</p>
                <p className="text-xs text-ink-500">{s.label}</p>
              </div>
            ))}
          </div>

          <figure className="mt-8 max-w-xl">
            <div className="mb-2 flex gap-1 text-brand-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} fill="currentColor" />
              ))}
            </div>
            <blockquote className="text-[15px] leading-relaxed text-ink-700">
              “The demo used our actual part list. Within 30 minutes I could see every truck's
              stock health — we signed that week.”
            </blockquote>
            <figcaption className="mt-2 text-sm text-ink-500">
              Marcus Reyes · Operations Manager, Cascade HVAC
            </figcaption>
          </figure>
        </div>

        {/* Right: form */}
        <div className="lg:sticky lg:top-24">
          <DemoForm defaultPlan={plan} />
        </div>
      </div>
    </section>
  );
}
