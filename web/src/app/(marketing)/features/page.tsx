import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ScanLine, Truck, ClipboardCheck, BarChart3 } from "lucide-react";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { CtaBand } from "@/components/marketing/CtaBand";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Real-time inventory, barcode scanning, truck-stock templates, receipt reconciliation, RBAC, reporting, and a technician mobile app.",
};

const DEEP_DIVES = [
  {
    icon: ScanLine,
    eyebrow: "Inventory",
    title: "Know exactly what you have, everywhere",
    body: "Track every part by model, type, location, and project. Scan stock in at the counter and out to a job. Set per-product low-stock thresholds so reordering is automatic, not a fire drill.",
    points: ["Barcode scan in / out", "Per-product thresholds", "Multi-location stock", "Full audit trail"],
  },
  {
    icon: Truck,
    eyebrow: "Truck stock",
    title: "Every truck stocked to its template",
    body: "Define the ideal kit per trade, assign templates to trucks, and let StockPilot track current vs. required quantities. Technicians replenish from their phone; you see gaps before they cost a callback.",
    points: ["Templates per trade", "Truck assignments", "Use-item from mobile", "Transfer to truck"],
    reverse: true,
  },
  {
    icon: ClipboardCheck,
    eyebrow: "Receipts",
    title: "Reconcile supply-house spend in a click",
    body: "Technicians snap a photo of receipts in the field. The office matches line items to stock, approves, and keeps a clean record for finance — no more shoeboxes of paper.",
    points: ["Photo capture", "Line-item reconciliation", "Approval workflow", "Cost tracking"],
  },
  {
    icon: BarChart3,
    eyebrow: "Reporting",
    title: "Reports finance and ops both trust",
    body: "Inventory and asset reports with one-click PDF and Excel exports. Role-based access keeps the right data in the right hands across admins, dispatchers, and technicians.",
    points: ["PDF & Excel exports", "Inventory & asset reports", "Role-based access", "Activity audit logs"],
    reverse: true,
  },
];

export default function FeaturesPage() {
  return (
    <>
      <section className="relative overflow-hidden pt-20">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="container-page max-w-3xl text-center">
          <p className="eyebrow">Platform</p>
          <h1 className="mt-3 text-balance text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
            One system for inventory, trucks, and the field
          </h1>
          <p className="mx-auto mt-5 text-lg text-ink-600">
            Everything your warehouse, office, and technicians need to keep parts flowing —
            without spreadsheets or guesswork.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/request-demo" className="btn-primary px-5 py-3 text-base">
              Request a demo <ArrowRight size={18} />
            </Link>
            <Link href="/pricing" className="btn-secondary px-5 py-3 text-base">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <FeatureGrid />

      <section className="bg-ink-50 py-8">
        <div className="container-page space-y-20 py-16">
          {DEEP_DIVES.map((d) => (
            <div
              key={d.title}
              className={`grid items-center gap-10 lg:grid-cols-2 ${d.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <d.icon size={14} /> {d.eyebrow}
                </span>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900">{d.title}</h2>
                <p className="mt-4 text-lg text-ink-600">{d.body}</p>
                <ul className="mt-6 grid grid-cols-2 gap-3">
                  {d.points.map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm font-medium text-ink-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card grid aspect-[4/3] place-items-center bg-gradient-to-br from-white to-ink-50 p-8">
                <d.icon size={120} className="text-brand-200" strokeWidth={1} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <HowItWorks />
      <CtaBand />
    </>
  );
}
