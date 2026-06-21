import Link from "next/link";
import { ArrowRight, ScanLine, Truck, ShieldCheck } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-ink [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-brand-200/40 blur-3xl" />

      <div className="container-page grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            New · Technician mobile app for iOS & Android
          </span>
          <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
            Stop losing parts.<br />
            Start running on{" "}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              real-time stock.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
            StockPilot connects your warehouse, technicians, and trucks. Scan parts in
            and out, keep every truck stocked to its template, reconcile receipts, and
            see exactly what you have — and what you're missing — in real time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/request-demo" className="btn-primary px-5 py-3 text-base">
              Request a demo <ArrowRight size={18} />
            </Link>
            <Link href="/register" className="btn-secondary px-5 py-3 text-base">
              Get started
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck size={16} className="text-brand-600" /> Guided onboarding included
            </span>
            <span className="inline-flex items-center gap-2">
              <ScanLine size={16} className="text-brand-600" /> Live in under a day
            </span>
          </div>
        </div>

        {/* Product mock */}
        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroMock />
        </div>
      </div>
    </section>
  );
}

function HeroMock() {
  return (
    <div className="relative mx-auto max-w-lg">
      <div className="card overflow-hidden shadow-2xl shadow-ink-900/10">
        <div className="flex items-center gap-1.5 border-b border-ink-100 bg-ink-50 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs font-medium text-ink-400">
            app.stockpilot.app/dashboard
          </span>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "In stock", value: "8,412", tone: "text-ink-900" },
              { label: "Low stock", value: "23", tone: "text-amber-600" },
              { label: "Trucks", value: "16", tone: "text-brand-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-ink-100 bg-ink-50/60 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
                  {s.label}
                </p>
                <p className={`mt-1 text-xl font-bold ${s.tone}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-ink-100 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink-800">Truck #14 — Van</p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                3 below min
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                { name: "3/4\" Copper elbow", cur: 4, req: 20 },
                { name: "Wire nuts (red)", cur: 60, req: 50 },
                { name: "PVC primer", cur: 1, req: 6 },
              ].map((row) => {
                const pct = Math.min(100, Math.round((row.cur / row.req) * 100));
                const low = row.cur < row.req;
                return (
                  <div key={row.name}>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-600">{row.name}</span>
                      <span className={low ? "font-semibold text-amber-600" : "text-ink-500"}>
                        {row.cur}/{row.req}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-full rounded-full ${low ? "bg-amber-400" : "bg-brand-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-5 hidden rotate-[-6deg] items-center gap-2 rounded-xl border border-ink-100 bg-white px-3 py-2 shadow-xl sm:flex">
        <Truck size={18} className="text-brand-600" />
        <span className="text-xs font-semibold text-ink-700">Receipt reconciled · $284.10</span>
      </div>
    </div>
  );
}
