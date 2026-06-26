"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, X, PackageMinus, Upload, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { TruckStockItem, ExtractedReceiptItem } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";

export default function MyTruckPage() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<TruckStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noTruck, setNoTruck] = useState(false);
  const [useItem, setUseItem] = useState<TruckStockItem | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const allowed = hasPermission(PERMISSIONS.VIEW_ASSIGNED_TRUCK_STOCK);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNoTruck(false);
    try {
      setItems(await api.myStock());
    } catch (err) {
      // A technician with no assigned truck gets a 404 — treat as an empty state.
      if (err instanceof ApiError && err.status === 404) setNoTruck(true);
      else setError(err instanceof Error ? err.message : "Failed to load your truck stock.");
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

  if (!allowed) {
    return (
      <div>
        <PageHeader title="My Truck" description="Your assigned truck stock." />
        <EmptyState title="No access" description="This area is for field technicians." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="My Truck"
        description="Stock assigned to your truck. Mark items as used and upload receipts."
        action={
          hasPermission(PERMISSIONS.UPLOAD_RECEIPT) && (
            <button className="btn-primary" onClick={() => setShowUpload(true)}>
              <Upload size={16} /> Upload receipt
            </button>
          )
        }
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : noTruck ? (
        <EmptyState
          title="No truck assigned"
          description="No truck is assigned to you yet. Ask your administrator to assign one."
        />
      ) : items.length === 0 ? (
        <EmptyState title="Your truck is empty" description="No stock items are configured for your truck yet." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">Item</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3 text-right">On truck</th>
                  <th className="px-5 py-3 text-right">Required</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {items.map((it) => {
                  const low = it.currentQuantity <= (it.minimumQuantity ?? 0);
                  return (
                    <tr key={it.id} className="hover:bg-ink-50/60">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-ink-900">{it.productName}</p>
                        {it.notes && <p className="text-xs text-ink-400">{it.notes}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{it.category || "—"}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink-800">
                        {it.currentQuantity}
                        {it.unit ? ` ${it.unit}` : ""}
                      </td>
                      <td className="px-5 py-3.5 text-right text-ink-600">{it.requiredQuantity}</td>
                      <td className="px-5 py-3.5">
                        {low ? <Badge tone="warn">Low</Badge> : <Badge tone="good">OK</Badge>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className="btn-secondary"
                          onClick={() => setUseItem(it)}
                          disabled={it.currentQuantity <= 0}
                        >
                          <PackageMinus size={15} /> Use
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {useItem && (
        <UseItemModal
          item={useItem}
          onClose={() => setUseItem(null)}
          onDone={() => {
            setUseItem(null);
            flash("Stock updated");
            load();
          }}
        />
      )}

      {showUpload && (
        <UploadReceiptModal
          onClose={() => setShowUpload(false)}
          onDone={() => {
            setShowUpload(false);
            flash("Receipt uploaded");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function UseItemModal({
  item,
  onClose,
  onDone,
}: {
  item: TruckStockItem;
  onClose: () => void;
  onDone: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.useTruckItem({ truckStockItemId: item.id, quantity: Number(quantity), notes: notes || undefined });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not record usage");
      setBusy(false);
    }
  }

  return (
    <ModalShell title={`Use "${item.productName}"`} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Quantity used *</label>
          <input
            type="number"
            min={1}
            max={item.currentQuantity}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            required
          />
          <p className="mt-1 text-xs text-ink-400">{item.currentQuantity} on truck</p>
        </div>
        <div>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. job #1234" />
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <PackageMinus size={16} />}
            Record usage
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function UploadReceiptModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [truckId, setTruckId] = useState<string | null>(null);
  const [truckLabel, setTruckLabel] = useState<string>("");
  const [loadingTruck, setLoadingTruck] = useState(true);
  const [totalAmount, setTotalAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<ExtractedReceiptItem[]>([]);
  const [reading, setReading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // A technician is tied to one truck — use it directly instead of a picker.
  useEffect(() => {
    api
      .myTruck()
      .then((t) => {
        setTruckId(t.truckId);
        setTruckLabel(
          t.truckNumber
            ? `Truck ${t.truckNumber}${t.plateNumber ? ` · ${t.plateNumber}` : ""}`
            : "",
        );
      })
      .catch(() => {})
      .finally(() => setLoadingTruck(false));
  }, []);

  // When a file is chosen, try to auto-read the total + line items with AI.
  // It's a convenience — failures are non-fatal and the tech can still type a total.
  async function onFileChange(picked: File | null) {
    setFile(picked);
    setItems([]);
    setAiNote(null);
    if (!picked) return;
    setReading(true);
    try {
      const base64 = await fileToBase64(picked);
      const result = await api.extractReceipt(picked.name, base64);
      if (result.total != null) setTotalAmount(String(result.total));
      setItems(result.items);
      setAiNote(
        result.items.length
          ? `Read ${result.items.length} item${result.items.length === 1 ? "" : "s"}` +
              (result.total != null ? ` · total $${result.total.toFixed(2)}` : "")
          : "No line items detected — enter the total manually.",
      );
    } catch (e2) {
      setAiNote(e2 instanceof ApiError ? e2.message : "Couldn't auto-read — enter the total manually.");
    } finally {
      setReading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!truckId) return setErr("No truck is assigned to you — ask an admin to assign one.");
    if (!file) return setErr("Choose a receipt file.");
    setBusy(true);
    try {
      const base64 = await fileToBase64(file);
      const uploaded = await api.uploadReceiptFile(file.name, base64);
      await api.createReceipt({
        truckId,
        fileUrl: uploaded.fileUrl,
        totalAmount: totalAmount ? Number(totalAmount) : undefined,
        items: items.length ? items : undefined,
      });
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Upload receipt" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Truck</label>
          {loadingTruck ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-ink-500">
              <Loader2 size={14} className="animate-spin" /> Loading your truck…
            </p>
          ) : truckId ? (
            <div className="input flex items-center bg-ink-50 text-ink-800">{truckLabel}</div>
          ) : (
            <p className="text-sm font-medium text-amber-600">
              No truck is assigned to you. Ask an admin to assign one before uploading receipts.
            </p>
          )}
        </div>
        <div>
          <label className="label">Receipt file *</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="input"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            required
          />
          {reading && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-brand-600">
              <Loader2 size={13} className="animate-spin" /> Reading receipt with AI…
            </p>
          )}
          {!reading && aiNote && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Sparkles size={13} className="text-brand-500" /> {aiNote}
            </p>
          )}
        </div>
        <div>
          <label className="label">Total amount</label>
          <input type="number" min={0} step="0.01" className="input" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
          <p className="mt-1 text-xs text-ink-400">Auto-filled from the receipt when possible — edit if needed.</p>
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy || reading || !truckId}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/** Read a File into a bare base64 string (strips the data: URL prefix). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
