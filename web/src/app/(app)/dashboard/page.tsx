"use client";

import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { CompanyDashboard } from "@/components/app/CompanyDashboard";
import { TechSpendingDashboard } from "@/components/app/TechSpendingDashboard";

export default function DashboardPage() {
  const { hasPermission } = useAuth();

  // Technicians can't view company stock, and the inventory dashboard loads
  // products/trucks they aren't permissioned for — give them their personal
  // spending dashboard instead.
  if (!hasPermission(PERMISSIONS.VIEW_STOCK)) {
    return <TechSpendingDashboard />;
  }
  return <CompanyDashboard />;
}
