"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ExternalLink, Check, Ban, ScanSearch, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Receipt } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";

interface ReconcileResult {
  status: string;
  matched: unknown[];
  missing: unknown[];
  extra: unknown[];
  priceDifferences: unknown[];
}

function statusTone(status: string): "good" | "warn" | "muted" | "default" {
  const s = status.toUpperCase();
  if (s === "APPROVED" || s === "RECONCILED") return "good";
  if (s === "REJECTED") return "muted";
  if (s === "NEEDS_REVIEW" || s === "PENDING") return "warn";
  return "default";
}

export default function ReceiptsPage() {
  const { hasPermission } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [recon, setRecon] = useState<{ id: string; result: ReconcileResult } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const allowed = hasPermission(PERMISSIONS.APPROVE_RECEIPTS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReceipts(await api.listReceipts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allowed) load();
    else setLoading(false);
  }, [allowed, load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  async function setStatus(r: Receipt, status: string) {
    setBusyId(r.id);
    try {
      await api.updateReceiptStatus(r.id, status);
      flash(`Receipt ${status.toLowerCase()}`);
      load();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reconcile(r: Receipt) {
    setBusyId(r.id);
    try {
      const result = (await api.reconcileReceipt(r.id)) as ReconcileResult;
      setRecon({ id: r.id, result });
      load();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Reconcile failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Receipts" description="Review and approve truck receipts." />
        <EmptyState title="No access" description="You don't have permission to approve receipts." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Receipts" description="Review, reconcile, and approve truck purchase receipts." />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : receipts.length === 0 ? (
        <EmptyState title="No receipts yet" description="Receipts uploaded by technicians will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Truck</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3.5 text-ink-600">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-500">{r.truckId}</td>
                    <td className="px-5 py-3.5 text-right text-ink-800">
                      {typeof r.totalAmount === "number" ? `$${r.totalAmount.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {r.fileUrl ? (
                        <a
                          href={r.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700"
                        >
                          View <ExternalLink size={13} />
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                          onClick={() => reconcile(r)}
                          disabled={busyId === r.id}
                          title="Reconcile against truck templates"
                          aria-label="Reconcile"
                        >
                          {busyId === r.id ? <Loader2 size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-green-50 hover:text-green-600"
                          onClick={() => setStatus(r, "APPROVED")}
                          disabled={busyId === r.id}
                          title="Approve"
                          aria-label="Approve"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => setStatus(r, "REJECTED")}
                          disabled={busyId === r.id}
                          title="Reject"
                          aria-label="Reject"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recon && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink-900">Reconciliation</h2>
              <button className="btn-ghost p-1.5" onClick={() => setRecon(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p>Result: <Badge tone={statusTone(recon.result.status)}>{recon.result.status}</Badge></p>
              <ul className="mt-2 space-y-1 text-ink-600">
                <li>Matched items: <strong className="text-ink-900">{recon.result.matched?.length ?? 0}</strong></li>
                <li>Missing (on template, not on receipt): <strong className="text-amber-600">{recon.result.missing?.length ?? 0}</strong></li>
                <li>Extra (on receipt, not on template): <strong className="text-amber-600">{recon.result.extra?.length ?? 0}</strong></li>
                <li>Price differences: <strong className="text-amber-600">{recon.result.priceDifferences?.length ?? 0}</strong></li>
              </ul>
            </div>
            <div className="mt-5 flex justify-end">
              <button className="btn-primary" onClick={() => setRecon(null)}>Done</button>
            </div>
          </div>
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
