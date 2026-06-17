"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { InventoryReport } from "@/lib/types";
import { PageHeader, Loading, ErrorState, StatCard } from "@/components/app/ui";

const EXPORTS: { resource: string; label: string }[] = [
  { resource: "products", label: "Products" },
  { resource: "assets", label: "Assets" },
  { resource: "users", label: "Users" },
];

const FORMATS: { ext: string; label: string; icon: typeof FileText }[] = [
  { ext: "pdf", label: "PDF", icon: FileText },
  { ext: "xlsx", label: "Excel", icon: FileSpreadsheet },
  { ext: "csv", label: "CSV", icon: FileDown },
];

/** Human label for an arbitrary report key. */
function labelize(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export default function ReportsPage() {
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [assets, setAssets] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, ast] = await Promise.allSettled([api.inventoryReport(), api.assetsReport()]);
      if (inv.status === "fulfilled") setInventory(inv.value);
      if (ast.status === "fulfilled") setAssets(ast.value);
      if (inv.status === "rejected" && ast.status === "rejected") throw inv.reason;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function download(resource: string, ext: string) {
    const key = `${resource}-${ext}`;
    setDownloading(key);
    try {
      await api.downloadExport(`/exports/${resource}/${ext}`, `${resource}.${ext}`);
      setToast(`Exported ${resource}.${ext}`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(null);
      setTimeout(() => setToast(null), 2600);
    }
  }

  const numericEntries = (r: InventoryReport | null) =>
    r
      ? Object.entries(r).filter(
          ([, v]) => typeof v === "number" || typeof v === "string",
        )
      : [];

  return (
    <div>
      <PageHeader title="Reports & exports" description="Live summaries and downloadable records." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Inventory summary
            </h2>
            {numericEntries(inventory).length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {numericEntries(inventory)
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <StatCard
                      key={k}
                      label={labelize(k)}
                      value={typeof v === "number" ? v.toLocaleString() : String(v)}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">No inventory summary available.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Assets summary
            </h2>
            {numericEntries(assets).length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {numericEntries(assets)
                  .slice(0, 8)
                  .map(([k, v]) => (
                    <StatCard
                      key={k}
                      label={labelize(k)}
                      value={typeof v === "number" ? v.toLocaleString() : String(v)}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-sm text-ink-400">No assets summary available.</p>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
              Export data
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {EXPORTS.map((res) => (
                <div key={res.resource} className="card p-5">
                  <p className="font-semibold text-ink-900">{res.label}</p>
                  <p className="mt-1 text-xs text-ink-400">Download the full {res.label.toLowerCase()} list.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {FORMATS.map((f) => {
                      const key = `${res.resource}-${f.ext}`;
                      return (
                        <button
                          key={f.ext}
                          onClick={() => download(res.resource, f.ext)}
                          disabled={downloading !== null}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          {downloading === key ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <f.icon size={14} />
                          )}
                          {f.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
