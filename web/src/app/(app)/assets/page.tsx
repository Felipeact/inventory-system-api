"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, X, Loader2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Asset } from "@/lib/types";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";
import { formatDate } from "@/lib/utils";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAssets(await api.listAssets());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.serialCode.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q),
    );
  }, [assets, query]);

  async function remove(a: Asset) {
    if (!confirm(`Delete asset "${a.name}"?`)) return;
    try {
      await api.deleteAsset(a.id);
      setAssets((prev) => prev.filter((x) => x.id !== a.id));
      flash("Asset deleted");
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Assets"
        description="Tools, equipment, and serialized assets."
        action={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add asset
          </button>
        }
      />

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          className="input pl-9"
          placeholder="Search name, serial, type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query ? "No matches" : "No assets yet"}
            description={query ? "Try another search." : "Register your first asset."}
            action={
              !query && (
                <button className="btn-primary" onClick={() => setShowAdd(true)}>
                  <Plus size={16} /> Add asset
                </button>
              )
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  <tr>
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Serial</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Added</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {filtered.map((a) => (
                    <tr key={a.id} className="hover:bg-ink-50/60">
                      <td className="px-5 py-3.5 font-medium text-ink-900">{a.name}</td>
                      <td className="px-5 py-3.5 text-ink-600">{a.type}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-ink-500">{a.serialCode}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={a.status === "active" ? "good" : "muted"}>{a.status}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-ink-500">{formatDate(a.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => remove(a)}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddAssetModal
          onClose={() => setShowAdd(false)}
          onCreated={(a) => {
            setAssets((prev) => [a, ...prev]);
            setShowAdd(false);
            flash("Asset added");
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

function AddAssetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (a: Asset) => void;
}) {
  const [form, setForm] = useState({ name: "", type: "", serialCode: "", status: "active", description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const created = await api.createAsset(form);
      onCreated(created);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not create asset");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Add asset</h2>
          <button className="btn-ghost p-1.5" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Type *</label>
            <input className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
          </div>
          <div>
            <label className="label">Serial code *</label>
            <input
              className="input font-mono"
              value={form.serialCode}
              onChange={(e) => setForm({ ...form, serialCode: e.target.value })}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {err && <p className="sm:col-span-2 text-sm font-medium text-red-600">{err}</p>}

          <div className="sm:col-span-2 mt-2 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
