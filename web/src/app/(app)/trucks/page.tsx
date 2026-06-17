"use client";

import { useCallback, useEffect, useState } from "react";
import { Truck as TruckIcon, ClipboardList, User } from "lucide-react";
import { api } from "@/lib/api";
import type { Truck, TruckStockTemplate } from "@/lib/types";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [templates, setTemplates] = useState<TruckStockTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, tpl] = await Promise.allSettled([api.listTrucks(), api.listTemplates()]);
      if (t.status === "fulfilled") setTrucks(t.value);
      if (tpl.status === "fulfilled") setTemplates(tpl.value);
      if (t.status === "rejected") throw t.reason;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fleet data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Fleet & truck stock" description="Trucks and the stock templates assigned to them." />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
        Trucks ({trucks.length})
      </h2>
      {trucks.length === 0 ? (
        <EmptyState title="No trucks yet" description="Add trucks from the desktop or mobile app to see them here." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trucks.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                    <TruckIcon size={20} />
                  </span>
                  <div>
                    <p className="font-semibold text-ink-900">Truck {t.truckNumber}</p>
                    {t.plateNumber && <p className="text-xs text-ink-400">{t.plateNumber}</p>}
                  </div>
                </div>
                <Badge tone={t.status === "ACTIVE" ? "good" : "muted"}>{t.status}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-ink-500">
                <User size={15} />
                {t.technician?.name || "Unassigned"}
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wide text-ink-500">
        Stock templates ({templates.length})
      </h2>
      {templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Create stock templates to standardize what each truck carries." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <div key={tpl.id} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-100 text-ink-500">
                  <ClipboardList size={20} />
                </span>
                <div>
                  <p className="font-semibold text-ink-900">{tpl.name}</p>
                  {tpl.tradeType && <p className="text-xs text-ink-400">{tpl.tradeType}</p>}
                </div>
              </div>
              <p className="mt-4 text-sm text-ink-500">
                {tpl.items?.length ?? 0} item{(tpl.items?.length ?? 0) === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
