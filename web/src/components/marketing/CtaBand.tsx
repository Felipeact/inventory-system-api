import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-8 py-16 text-center shadow-xl sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-grid-ink opacity-20 [background-size:32px_32px]" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              See StockPilot on your own trucks
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-brand-50/90">
              A 30-minute personalized demo with sample data for your trade. No slides —
              just the product, set up the way you'd actually run it.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/request-demo"
                className="btn bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50"
              >
                Request a demo <ArrowRight size={18} />
              </Link>
              <Link
                href="/register"
                className="btn border border-white/30 px-6 py-3 text-base text-white hover:bg-white/10"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
