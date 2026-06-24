"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, AlertTriangle, Truck, HardHat, ScanLine, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { api } from "@/lib/api";
import { productQuantity, type Product, type Truck as TruckT } from "@/lib/types";
import { PageHeader, StatCard, Loading, ErrorState, Badge } from "@/components/app/ui";
import { useAuth } from "@/lib/auth";

/**
 * Company-wide inventory & fleet dashboard. Shown to roles that can view stock
 * (admin, warehouse). Technicians get TechSpendingDashboard instead.
 */
export function CompanyDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [trucks, setTrucks] = useState<TruckT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, low, t] = await Promise.allSettled([
        api.listProducts(),
        api.lowStockProducts(),
        api.listTrucks(),
      ]);
      if (p.status === "fulfilled") setProducts(p.value);
      if (low.status === "fulfilled") setLowStock(low.value);
      if (t.status === "fulfilled") setTrucks(t.value);
      if (p.status === "rejected") throw p.reason;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading your dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const totalUnits = products.reduce((sum, p) => sum + productQuantity(p), 0);
  const chartData = products
    .slice()
    .sort((a, b) => productQuantity(b) - productQuantity(a))
    .slice(0, 7)
    .map((p) => ({
      name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
      qty: productQuantity(p),
      low: productQuantity(p) <= (p.lowStockThreshold ?? 0),
    }));

  return (
    <div>
      <PageHeader
        title={`Welcome back${user?.name ? ", " + user.name.split(" ")[0] : ""}`}
        description="Here's the state of your inventory and fleet right now."
        action={
          <Link href="/products" className="btn-primary">
            <ScanLine size={16} /> Manage stock
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={products.length} icon={Boxes} tone="brand" />
        <StatCard label="Units in stock" value={totalUnits.toLocaleString()} icon={Boxes} />
        <StatCard
          label="Low stock"
          value={lowStock.length}
          tone={lowStock.length ? "warn" : "good"}
          icon={AlertTriangle}
          hint={lowStock.length ? "Needs attention" : "All healthy"}
        />
        <StatCard label="Trucks" value={trucks.length} icon={Truck} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-ink-900">Top products by quantity</h2>
          {chartData.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink-400">No product data yet.</p>
          ) : (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -16, right: 8, top: 8 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(99,102,241,0.06)" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="qty" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.low ? "#f59e0b" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Low stock list */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink-900">Low stock</h2>
            <Link href="/products" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {lowStock.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-400">
                Nothing below threshold. 🎉
              </p>
            ) : (
              lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{p.name}</p>
                    <p className="truncate text-xs text-ink-400">{p.barcode}</p>
                  </div>
                  <Badge tone="warn">{productQuantity(p)} left</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Add a product", href: "/products", icon: Boxes },
          { label: "Register an asset", href: "/assets", icon: HardHat },
          { label: "View reports", href: "/reports", icon: ArrowRight },
        ].map((q) => (
          <Link
            key={q.label}
            href={q.href}
            className="card flex items-center justify-between p-5 transition hover:border-brand-200 hover:shadow-md"
          >
            <span className="flex items-center gap-3 text-sm font-semibold text-ink-800">
              <q.icon size={18} className="text-brand-600" />
              {q.label}
            </span>
            <ArrowRight size={16} className="text-ink-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
