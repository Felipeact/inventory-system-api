"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  HardHat,
  Truck,
  BarChart3,
  Settings,
  Users,
  PackageCheck,
  ReceiptText,
  Sparkles,
  CreditCard,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, the item is shown only when the user has this permission. */
  perm?: string;
}

const NAV: NavItem[] = [
  // Dashboard is role-aware (company view for stock roles, personal spending for
  // technicians), so it has no permission gate — every role gets a landing page.
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/assistant", icon: Sparkles },
  { label: "Products", href: "/products", icon: Boxes, perm: PERMISSIONS.VIEW_STOCK },
  { label: "Assets", href: "/assets", icon: HardHat, perm: PERMISSIONS.VIEW_ASSET },
  { label: "Fleet", href: "/trucks", icon: Truck, perm: PERMISSIONS.VIEW_TRUCK_STOCK },
  {
    label: "My Truck",
    href: "/my-truck",
    icon: PackageCheck,
    perm: PERMISSIONS.VIEW_ASSIGNED_TRUCK_STOCK,
  },
  {
    // Admin approval tool. Technicians upload receipts from the mobile app and
    // see their own spend on their dashboard, so this stays approver-only.
    label: "Receipts",
    href: "/receipts",
    icon: ReceiptText,
    perm: PERMISSIONS.APPROVE_RECEIPTS,
  },
  { label: "Truck Costs", href: "/truck-costs", icon: Wallet, perm: PERMISSIONS.APPROVE_RECEIPTS },
  { label: "Reports", href: "/reports", icon: BarChart3, perm: PERMISSIONS.VIEW_STOCK },
  { label: "Team", href: "/users", icon: Users, perm: PERMISSIONS.MANAGE_USERS },
  { label: "Billing", href: "/billing", icon: CreditCard, perm: PERMISSIONS.MANAGE_USERS },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();

  const items = NAV.filter((item) => !item.perm || hasPermission(item.perm));

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-100 bg-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-100 px-5">
          <Logo href="/dashboard" />
          <button className="btn-ghost p-1.5 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                )}
              >
                <item.icon size={18} className={active ? "text-brand-600" : "text-ink-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {hasPermission(PERMISSIONS.MANAGE_USERS) && (
          <div className="border-t border-ink-100 p-3">
            <Link
              href="/billing"
              className="block rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white"
            >
              <p className="text-sm font-semibold">Upgrade your plan</p>
              <p className="mt-1 text-xs text-brand-50/90">
                Unlock unlimited users, trucks & reports.
              </p>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
