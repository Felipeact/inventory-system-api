"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, AlertTriangle, ReceiptText } from "lucide-react";
import { api } from "@/lib/api";
import type { Product, Receipt } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Loading, ErrorState } from "@/components/app/ui";

const qtyOf = (p: Product) => p.quantity ?? p.inventory?.quantity ?? 0;

/**
 * Actionable alerts — low-stock products and pending receipts — mirroring the
 * desktop notifications panel. Each section is permission-gated.
 */
export default function NotificationsPage() {
  const { hasPermission } = useAuth();
  const seeLow = hasPermission(PERMISSIONS.VIEW_STOCK);
  const seeReceipts = hasPermission(PERMISSIONS.APPROVE_RECEIPTS);

  const [low, setLow] = useState<Product[]>([]);
  const [pending, setPending] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lowRes, recRes] = await Promise.allSettled([
        seeLow ? api.lowStockProducts() : Promise.resolve<Product[]>([]),
        seeReceipts ? api.listReceipts() : Promise.resolve<Receipt[]>([]),
      ]);
      if (lowRes.status === "fulfilled") setLow(lowRes.value);
      if (recRes.status === "fulfilled") {
        setPending(
          recRes.value.filter((r) => (r.status ?? "").toUpperCase() === "PENDING"),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [seeLow, seeReceipts]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label="Loading notifications…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Notifications" description="Low stock and receipts that need attention." />

      <div className="space-y-5">
        {seeLow && (
          <Section
            icon={<AlertTriangle size={16} />}
            title="Low stock"
            count={low.length}
            tone={low.length ? "danger" : "good"}
            empty="Everything is stocked — no alerts."
          >
            {low.slice(0, 100).map((p) => (
              <Row
                key={p.id}
                label={p.name}
                value={`${qtyOf(p)} / ${p.lowStockThreshold}`}
                danger
              />
            ))}
          </Section>
        )}

        {seeReceipts && (
          <Section
            icon={<ReceiptText size={16} />}
            title="Pending receipts"
            count={pending.length}
            tone={pending.length ? "warn" : "good"}
            empty="No receipts awaiting review."
          >
            {pending.slice(0, 100).map((r) => (
              <Row
                key={r.id}
                label={r.truck?.truckNumber ? `Truck ${r.truck.truckNumber}` : "Receipt"}
                value={typeof r.totalAmount === "number" ? `$${r.totalAmount.toFixed(2)}` : "—"}
              />
            ))}
          </Section>
        )}

        {!seeLow && !seeReceipts && (
          <div className="card flex items-center gap-2 p-6 text-ink-500">
            <Bell size={18} /> No notifications.
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  tone,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone: "danger" | "warn" | "good";
  empty: string;
  children: React.ReactNode[];
}) {
  const toneClass =
    tone === "danger"
      ? "bg-red-500"
      : tone === "warn"
        ? "bg-amber-500"
        : "bg-green-500";
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-100 px-5 py-3">
        <span className="text-ink-500">{icon}</span>
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        <span className={`ml-1 rounded-full ${toneClass} px-2 py-0.5 text-xs font-bold text-white`}>
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="px-5 py-4 text-sm text-ink-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-ink-100">{children}</ul>
      )}
    </div>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <li className="flex items-center justify-between px-5 py-2.5 text-sm">
      <span className="text-ink-700">{label}</span>
      <span className={`font-semibold ${danger ? "text-red-600" : "text-ink-900"}`}>{value}</span>
    </li>
  );
}
