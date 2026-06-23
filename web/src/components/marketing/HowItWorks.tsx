import { Smartphone, Truck, ClipboardCheck } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Truck,
    title: "Template every truck",
    body: "Build stock templates per trade and assign them to trucks. Vantori knows the target quantity for every part on every van.",
  },
  {
    n: "02",
    icon: Smartphone,
    title: "Technicians work from their phone",
    body: "Crews see their assigned stock, scan parts as they use them, and snap a photo of supply-house receipts — all from the mobile app.",
  },
  {
    n: "03",
    icon: ClipboardCheck,
    title: "The office stays in control",
    body: "Low-stock alerts, receipt reconciliation, and live reports give dispatchers and admins a real-time picture without chasing anyone.",
  },
];

export function HowItWorks() {
  return (
    <section id="mobile" className="bg-ink-50 py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Set it up once. It runs itself.
          </h2>
        </div>

        <div className="relative mt-16 grid gap-8 lg:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card relative p-8">
              <span className="text-5xl font-extrabold text-brand-100">{s.n}</span>
              <div className="mt-4 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-white">
                <s.icon size={24} />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
