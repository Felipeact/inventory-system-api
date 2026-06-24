import {
  ScanLine,
  Truck,
  Boxes,
  ClipboardCheck,
  BarChart3,
  ShieldCheck,
  Bell,
  Smartphone,
} from "lucide-react";

const FEATURES = [
  {
    icon: Boxes,
    title: "Real-time inventory",
    body: "Every part, model, and location tracked live. Set low-stock thresholds and never get caught short on a job.",
  },
  {
    icon: ScanLine,
    title: "Barcode scan in / out",
    body: "Receive and issue stock with a scan from the warehouse counter or the technician's phone.",
  },
  {
    icon: Truck,
    title: "Truck-stock templates",
    body: "Define the ideal kit per trade and truck, assign it once, and keep every van replenished to spec.",
  },
  {
    icon: ClipboardCheck,
    title: "Receipt reconciliation",
    body: "Techs upload supply-house receipts from the field; office staff reconcile line items in a click.",
  },
  {
    icon: Bell,
    title: "Low-stock alerts",
    body: "Get notified the moment a truck or warehouse drops below minimum, before it becomes a missed appointment.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & permissions",
    body: "Granular RBAC keeps technicians, dispatchers, and admins in exactly the right lane.",
  },
  {
    icon: BarChart3,
    title: "Reports & exports",
    body: "Inventory and asset reports with one-click PDF and Excel exports for finance and audits.",
  },
  {
    icon: Smartphone,
    title: "Mobile for the field",
    body: "A native iOS & Android app built for technicians: my-stock, scan, low-stock, and receipts on the go.",
  },
];

export function FeatureGrid() {
  return (
    <section id="product" className="py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Everything in one platform</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            From the warehouse shelf to the truck to the job
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            Stockvio replaces spreadsheets, clipboards, and guesswork with a single,
            connected system your whole team actually uses.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card group p-6 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-600/5"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
