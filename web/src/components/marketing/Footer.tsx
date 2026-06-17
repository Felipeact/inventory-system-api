import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { BRAND } from "@/lib/brand";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Mobile app", href: "/features#mobile" },
      { label: "Request a demo", href: "/request-demo" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "HVAC", href: "/request-demo?trade=hvac" },
      { label: "Plumbing", href: "/request-demo?trade=plumbing" },
      { label: "Electrical", href: "/request-demo?trade=electrical" },
      { label: "Mechanical", href: "/request-demo?trade=mechanical" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "Contact sales", href: "/request-demo" },
      { label: "Status", href: "/#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            {BRAND.tagline}. One source of truth for your warehouse, technicians, and trucks.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold text-ink-900">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-500 transition hover:text-ink-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200/70">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-sm text-ink-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/#" className="hover:text-ink-900">
              Privacy
            </Link>
            <Link href="/#" className="hover:text-ink-900">
              Terms
            </Link>
            <Link href="/#" className="hover:text-ink-900">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
