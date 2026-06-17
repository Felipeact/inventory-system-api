"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { MARKETING_NAV } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/80 backdrop-blur-md">
      <nav className="container-page flex h-16 items-center justify-between">
        <Logo />

        <div className="hidden items-center gap-8 md:flex">
          {MARKETING_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-ink-600 transition hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <Link href="/dashboard" className="btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/request-demo" className="btn-primary">
                Request a demo
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="btn-ghost p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {MARKETING_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-ink-100 pt-3">
              <Link href="/login" className="btn-secondary" onClick={() => setOpen(false)}>
                Sign in
              </Link>
              <Link href="/request-demo" className="btn-primary" onClick={() => setOpen(false)}>
                Request a demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
