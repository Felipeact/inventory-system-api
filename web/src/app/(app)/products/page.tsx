"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, ScanLine, X, Loader2, ArrowDownToLine, ArrowUpFromLine, Pencil } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { productQuantity, type Product } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.ADD_PRODUCT);
  const canScan = hasPermission(PERMISSIONS.SCAN_IN) || hasPermission(PERMISSIONS.SCAN_OUT);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await api.listProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        (p.type ?? "").toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q),
    );
  }, [products, query]);

  async function handleDelete(p: Product) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteProduct(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      flash("Product deleted");
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your inventory catalog with live quantities."
        action={
          canManage && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add product
            </button>
          )
        }
      />

      {canScan && <ScanBar onDone={(msg) => { flash(msg); load(); }} />}

      <div className="mt-6">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search name, barcode, type, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "No matches" : "No products yet"}
            description={
              query
                ? "Try a different search term."
                : "Add your first product or scan stock in to get started."
            }
            action={
              !query && canManage && (
                <button className="btn-primary" onClick={() => setShowAdd(true)}>
                  <Plus size={16} /> Add product
                </button>
              )
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Barcode</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map((p) => {
                    const qty = productQuantity(p);
                    const low = qty <= (p.lowStockThreshold ?? 0);
                    return (
                      <tr key={p.id} className="hover:bg-ink-50/60">
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-ink-900">{p.name}</p>
                          {p.model && <p className="text-xs text-ink-400">{p.model}</p>}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-xs text-ink-500">{p.barcode}</td>
                        <td className="px-5 py-3.5 text-ink-600">{p.type || "—"}</td>
                        <td className="px-5 py-3.5 text-ink-600">{p.location || "—"}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span className={low ? "font-semibold text-amber-600" : "font-medium text-ink-800"}>
                            {qty}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {low ? (
                            <Badge tone="warn">Low stock</Badge>
                          ) : (
                            <Badge tone="good">{p.status || "Active"}</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {canManage && (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditing(p)}
                                className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                                aria-label="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(p)}
                                className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                                aria-label="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {(showAdd || editing) && (
        <ProductModal
          product={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={(p, isEdit) => {
            setProducts((prev) =>
              isEdit ? prev.map((x) => (x.id === p.id ? p : x)) : [p, ...prev],
            );
            setShowAdd(false);
            setEditing(null);
            flash(isEdit ? "Product updated" : "Product added");
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

function ScanBar({ onDone }: { onDone: (msg: string) => void }) {
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function scan(dir: "in" | "out") {
    if (!barcode.trim() || qty < 1) {
      setErr("Enter a barcode and a quantity of at least 1.");
      return;
    }
    setErr(null);
    setBusy(dir);
    try {
      if (dir === "in") await api.scanIn(barcode.trim(), qty);
      else await api.scanOut(barcode.trim(), qty);
      onDone(`Scanned ${dir === "in" ? "in" : "out"} ${qty} × ${barcode.trim()}`);
      setBarcode("");
      setQty(1);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Scan failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-700">
          <ScanLine size={18} className="text-brand-600" /> Quick scan
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="label">Barcode</label>
          <input
            className="input font-mono"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Scan or type barcode"
          />
        </div>
        <div className="w-24">
          <label className="label">Qty</label>
          <input
            type="number"
            min={1}
            className="input"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          />
        </div>
        <button className="btn-secondary" onClick={() => scan("in")} disabled={busy !== null}>
          {busy === "in" ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownToLine size={16} />}
          In
        </button>
        <button className="btn-secondary" onClick={() => scan("out")} disabled={busy !== null}>
          {busy === "out" ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpFromLine size={16} />}
          Out
        </button>
      </div>
      {err && <p className="mt-2 text-sm font-medium text-red-600">{err}</p>}
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (p: Product, isEdit: boolean) => void;
}) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    barcode: product?.barcode ?? "",
    quantity: product ? productQuantity(product) : 0,
    lowStockThreshold: product?.lowStockThreshold ?? 5,
    type: product?.type ?? "",
    location: product?.location ?? "",
    model: product?.model ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        barcode: form.barcode,
        quantity: Number(form.quantity),
        lowStockThreshold: Number(form.lowStockThreshold),
        type: form.type || undefined,
        location: form.location || undefined,
        model: form.model || undefined,
      };
      const saved = product
        ? await api.updateProduct(product.id, payload)
        : await api.createProduct(payload);
      onSaved(saved, isEdit);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not save product");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">{isEdit ? "Edit product" : "Add product"}</h2>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div>
            <label className="label">Barcode *</label>
            <input
              className="input font-mono"
              value={form.barcode}
              onChange={(e) => set("barcode", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Model</label>
            <input className="input" value={form.model} onChange={(e) => set("model", e.target.value)} />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Low-stock threshold</label>
            <input
              type="number"
              min={0}
              className="input"
              value={form.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">Type</label>
            <input className="input" value={form.type} onChange={(e) => set("type", e.target.value)} />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>

          {err && <p className="sm:col-span-2 text-sm font-medium text-red-600">{err}</p>}

          <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
