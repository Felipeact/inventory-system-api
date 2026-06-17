import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { BRAND } from "@/lib/brand";
import { Check } from "lucide-react";

const HIGHLIGHTS = [
  "Real-time inventory across warehouse and trucks",
  "Barcode scan-in / scan-out from any device",
  "Truck-stock templates & low-stock alerts",
  "Receipt reconciliation and exportable reports",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div className="pointer-events-none absolute inset-0 bg-grid-ink opacity-20 [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Logo href="/" invert />
          <div>
            <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
              The operating system for inventory and truck stock.
            </h2>
            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((h) => (
                <li key={h} className="flex items-center gap-3 text-brand-50/90">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500/30 text-brand-200">
                    <Check size={13} />
                  </span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-ink-400">
            © {new Date().getFullYear()} {BRAND.name}
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:hidden">
          <Logo href="/" />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <div className="p-6 text-center text-sm text-ink-400">
          <Link href="/" className="hover:text-ink-600">
            ← Back to site
          </Link>
        </div>
      </div>
    </div>
  );
}
