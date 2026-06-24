import type { Metadata } from "next";
import { PricingCards } from "@/components/marketing/PricingCards";
import { EstimatedCost } from "@/components/marketing/EstimatedCost";
import { ComparisonTable } from "@/components/marketing/ComparisonTable";
import { Faq } from "@/components/marketing/Faq";
import { CtaBand } from "@/components/marketing/CtaBand";
import { Smartphone, Monitor, Server, Boxes } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple flat-rate pricing for inventory and truck-stock management, built for field-service teams. Plans from $199/month, scaling to unlimited users and trucks.",
};

const PLATFORMS = [
  { icon: Monitor, label: "Web dashboard" },
  { icon: Smartphone, label: "iOS app" },
  { icon: Smartphone, label: "Android app" },
  { icon: Boxes, label: "Barcode scanners" },
  { icon: Monitor, label: "Desktop (Windows)" },
  { icon: Server, label: "REST API" },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden pt-20">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="container-page text-center">
          <p className="eyebrow">Pricing plans</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            Pricing that scales with your crew
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-600">
            One flat monthly price per plan — no per-seat math. Pick a plan, roll out
            to every truck, and cancel anytime.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-page">
          <PricingCards />
        </div>
      </section>

      {/* Platforms — echoes the "available on your favorite platforms" section */}
      <section className="border-y border-ink-100 bg-ink-50 py-16">
        <div className="container-page text-center">
          <h2 className="text-xl font-semibold text-ink-900">
            Stockvio works everywhere your team does
          </h2>
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {PLATFORMS.map((p) => (
              <div key={p.label} className="flex items-center gap-2.5 text-ink-600">
                <p.icon size={22} className="text-brand-600" />
                <span className="text-sm font-medium">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <EstimatedCost />
      <ComparisonTable />
      <Faq />
      <CtaBand />
    </>
  );
}
