"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, X, Pencil, Trash2, Link2, ArrowRightLeft } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  Assignment,
  CompanyUser,
  Product,
  TemplateItem,
  Truck,
  TruckStockTemplate,
} from "@/lib/types";
import { productQuantity } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";

type Tab = "trucks" | "templates" | "assignments" | "transfer";

export default function FleetPage() {
  const { hasPermission } = useAuth();
  const [tab, setTab] = useState<Tab>("trucks");
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [templates, setTemplates] = useState<TruckStockTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canManage = hasPermission(PERMISSIONS.MANAGE_TRUCK_STOCK);
  const canAssign = hasPermission(PERMISSIONS.ASSIGN_TRUCK_STOCK);
  const canTransfer = hasPermission(PERMISSIONS.TRANSFER_STOCK_TO_TRUCK);
  const canView = hasPermission(PERMISSIONS.VIEW_TRUCK_STOCK) || hasPermission(PERMISSIONS.VIEW_ALL_TRUCKS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, tpl, asg] = await Promise.allSettled([
        api.listTrucks(),
        api.listTemplates(),
        canManage ? api.listAssignments() : Promise.resolve([] as Assignment[]),
      ]);
      if (t.status === "fulfilled") setTrucks(t.value);
      if (tpl.status === "fulfilled") setTemplates(tpl.value);
      if (asg.status === "fulfilled") setAssignments(asg.value);
      if (t.status === "rejected" && tpl.status === "rejected") throw t.reason;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load fleet data.");
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    if (canView) load();
    else setLoading(false);
  }, [canView, load]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const TABS: { id: Tab; label: string; show: boolean }[] = [
    { id: "trucks", label: "Trucks", show: true },
    { id: "templates", label: "Templates", show: true },
    { id: "assignments", label: "Assignments", show: canManage || canAssign },
    { id: "transfer", label: "Transfer", show: canTransfer },
  ];

  if (!canView) {
    return (
      <div>
        <PageHeader title="Fleet" description="Trucks, stock templates, and assignments." />
        <EmptyState title="No access" description="You don't have permission to view fleet data." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Fleet" description="Manage trucks, stock templates, assignments, and transfers." />

      <div className="mb-6 flex gap-1 border-b border-ink-100">
        {TABS.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "border-b-2 px-4 py-2.5 text-sm font-medium transition " +
              (tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          {tab === "trucks" && (
            <TrucksTab trucks={trucks} canManage={canManage} onChanged={load} flash={flash} />
          )}
          {tab === "templates" && (
            <TemplatesTab templates={templates} canManage={canManage} onChanged={load} flash={flash} />
          )}
          {tab === "assignments" && (
            <AssignmentsTab
              assignments={assignments}
              trucks={trucks}
              templates={templates}
              canAssign={canAssign}
              onChanged={load}
              flash={flash}
            />
          )}
          {tab === "transfer" && <TransferTab templates={templates} flash={flash} />}
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Trucks ----------------------------- */

function TrucksTab({
  trucks,
  canManage,
  onChanged,
  flash,
}: {
  trucks: Truck[];
  canManage: boolean;
  onChanged: () => void;
  flash: (m: string) => void;
}) {
  const [edit, setEdit] = useState<Truck | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add truck
          </button>
        </div>
      )}
      {trucks.length === 0 ? (
        <EmptyState title="No trucks yet" description="Add your first truck to start building the fleet." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">Truck</th>
                  <th className="px-5 py-3">Plate</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3">Status</th>
                  {canManage && <th className="px-5 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {trucks.map((t) => (
                  <tr key={t.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3.5 font-medium text-ink-900">{t.truckNumber}</td>
                    <td className="px-5 py-3.5 text-ink-600">{t.plateNumber || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-600">
                      {t.technician ? t.technician.name || t.technician.email : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={t.status === "ACTIVE" ? "good" : "muted"}>{t.status}</Badge>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <button
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                          onClick={() => setEdit(t)}
                          aria-label="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(adding || edit) && (
        <TruckModal
          truck={edit}
          onClose={() => {
            setAdding(false);
            setEdit(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEdit(null);
            flash(edit ? "Truck updated" : "Truck added");
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function TruckModal({
  truck,
  onClose,
  onSaved,
}: {
  truck: Truck | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { hasPermission } = useAuth();
  const [form, setForm] = useState({
    truckNumber: truck?.truckNumber ?? "",
    plateNumber: truck?.plateNumber ?? "",
    status: truck?.status ?? "ACTIVE",
    technicianId: truck?.technicianId ?? "",
  });
  const [techs, setTechs] = useState<CompanyUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Only admins can list users; technician picker is optional.
    if (hasPermission(PERMISSIONS.MANAGE_USERS)) {
      api.listUsers().then(setTechs).catch(() => {});
    }
  }, [hasPermission]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const payload = {
      truckNumber: form.truckNumber,
      plateNumber: form.plateNumber || undefined,
      status: form.status,
      technicianId: form.technicianId || undefined,
    };
    try {
      if (truck) await api.updateTruck(truck.id, { ...payload, technicianId: form.technicianId || null });
      else await api.createTruck(payload);
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not save truck");
      setBusy(false);
    }
  }

  return (
    <ModalShell title={truck ? "Edit truck" : "Add truck"} onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Truck number *</label>
          <input className="input" value={form.truckNumber} onChange={(e) => setForm((f) => ({ ...f, truckNumber: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Plate number</label>
          <input className="input" value={form.plateNumber} onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
        {techs.length > 0 && (
          <div>
            <label className="label">Technician</label>
            <select className="input" value={form.technicianId} onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}>
              <option value="">Unassigned</option>
              {techs.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
        )}
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {truck ? "Save" : "Add truck"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ----------------------------- Templates ----------------------------- */

function TemplatesTab({
  templates,
  canManage,
  onChanged,
  flash,
}: {
  templates: TruckStockTemplate[];
  canManage: boolean;
  onChanged: () => void;
  flash: (m: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<TruckStockTemplate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function openEdit(t: TruckStockTemplate) {
    setBusyId(t.id);
    try {
      const full = await api.getTemplate(t.id);
      setEdit(full);
    } catch {
      setEdit(t);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(t: TruckStockTemplate) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await api.deleteTemplate(t.id);
      flash("Template deleted");
      onChanged();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> New template
          </button>
        </div>
      )}
      {templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Create a stock template that defines what each truck should carry." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-ink-900">{t.name}</p>
                  {t.tradeType && <p className="text-xs text-ink-400">{t.tradeType}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                      onClick={() => openEdit(t)}
                      disabled={busyId === t.id}
                      aria-label="Edit"
                    >
                      {busyId === t.id ? <Loader2 size={15} className="animate-spin" /> : <Pencil size={15} />}
                    </button>
                    <button
                      className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                      onClick={() => remove(t)}
                      aria-label="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm text-ink-500">{t.items?.length ?? 0} item(s)</p>
            </div>
          ))}
        </div>
      )}

      {(adding || edit) && (
        <TemplateModal
          template={edit}
          onClose={() => {
            setAdding(false);
            setEdit(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEdit(null);
            flash(edit ? "Template updated" : "Template created");
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: TruckStockTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [tradeType, setTradeType] = useState(template?.tradeType ?? "");
  const [items, setItems] = useState<TemplateItem[]>(
    template?.items?.length
      ? template.items.map((i) => ({ ...i }))
      : [{ productName: "", requiredQuantity: 1, minimumQuantity: 1, unit: "", category: "" }],
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setItem(idx: number, patch: Partial<TemplateItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addRow() {
    setItems((prev) => [...prev, { productName: "", requiredQuantity: 1, minimumQuantity: 1, unit: "", category: "" }]);
  }
  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const cleaned = items
      .filter((i) => i.productName.trim())
      .map((i) => ({
        productName: i.productName.trim(),
        requiredQuantity: Number(i.requiredQuantity) || 1,
        minimumQuantity: Number(i.minimumQuantity ?? 1) || 1,
        unit: i.unit?.trim() || undefined,
        category: i.category?.trim() || undefined,
      }));
    if (!cleaned.length) {
      setErr("Add at least one item with a product name.");
      return;
    }
    setBusy(true);
    try {
      if (template) await api.updateTemplate(template.id, { name, tradeType: tradeType || undefined, items: cleaned });
      else await api.createTemplate({ name, tradeType: tradeType || undefined, items: cleaned });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not save template");
      setBusy(false);
    }
  }

  return (
    <ModalShell title={template ? "Edit template" : "New template"} onClose={onClose} wide>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Trade type</label>
            <input className="input" value={tradeType} onChange={(e) => setTradeType(e.target.value)} placeholder="e.g. HVAC" />
          </div>
        </div>

        <div>
          <label className="label">Items</label>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <input
                  className="input col-span-5"
                  placeholder="Product name"
                  value={it.productName}
                  onChange={(e) => setItem(idx, { productName: e.target.value })}
                />
                <input
                  className="input col-span-2"
                  type="number"
                  min={1}
                  placeholder="Req"
                  value={it.requiredQuantity}
                  onChange={(e) => setItem(idx, { requiredQuantity: Number(e.target.value) })}
                />
                <input
                  className="input col-span-2"
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={it.minimumQuantity ?? 1}
                  onChange={(e) => setItem(idx, { minimumQuantity: Number(e.target.value) })}
                />
                <input
                  className="input col-span-2"
                  placeholder="Unit"
                  value={it.unit ?? ""}
                  onChange={(e) => setItem(idx, { unit: e.target.value })}
                />
                <button
                  type="button"
                  className="col-span-1 rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                  onClick={() => removeRow(idx)}
                  aria-label="Remove item"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn-ghost mt-2 text-sm" onClick={addRow}>
            <Plus size={15} /> Add item
          </button>
        </div>

        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {template ? "Save template" : "Create template"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ----------------------------- Assignments ----------------------------- */

function AssignmentsTab({
  assignments,
  trucks,
  templates,
  canAssign,
  onChanged,
  flash,
}: {
  assignments: Assignment[];
  trucks: Truck[];
  templates: TruckStockTemplate[];
  canAssign: boolean;
  onChanged: () => void;
  flash: (m: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  const truckName = (id: string) => trucks.find((t) => t.id === id)?.truckNumber || id;
  const templateName = (id: string) => templates.find((t) => t.id === id)?.name || id;

  async function remove(a: Assignment) {
    if (!confirm("Remove this assignment?")) return;
    try {
      await api.deleteAssignment(a.id);
      flash("Assignment removed");
      onChanged();
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Remove failed");
    }
  }

  return (
    <div>
      {canAssign && (
        <div className="mb-4 flex justify-end">
          <button className="btn-primary" onClick={() => setAdding(true)}>
            <Link2 size={16} /> Assign template
          </button>
        </div>
      )}
      {assignments.length === 0 ? (
        <EmptyState title="No assignments yet" description="Assign a stock template to a truck." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3">Truck</th>
                <th className="px-5 py-3">Template</th>
                {canAssign && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {assignments.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50/60">
                  <td className="px-5 py-3.5 font-medium text-ink-900">
                    {a.truck?.truckNumber || truckName(a.truckId)}
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{a.template?.name || templateName(a.templateId)}</td>
                  {canAssign && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                        onClick={() => remove(a)}
                        aria-label="Remove"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <AssignModal
          trucks={trucks}
          templates={templates}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            flash("Template assigned");
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AssignModal({
  trucks,
  templates,
  onClose,
  onSaved,
}: {
  trucks: Truck[];
  templates: TruckStockTemplate[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [truckId, setTruckId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!truckId || !templateId) return setErr("Pick a truck and a template.");
    setBusy(true);
    try {
      await api.createAssignment({ truckId, templateId });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not assign");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Assign template" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Truck *</label>
          <select className="input" value={truckId} onChange={(e) => setTruckId(e.target.value)} required>
            <option value="" disabled>Select a truck…</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.truckNumber}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Template *</label>
          <select className="input" value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
            <option value="" disabled>Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
            Assign
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* ----------------------------- Transfer ----------------------------- */

function TransferTab({
  templates,
  flash,
}: {
  templates: TruckStockTemplate[];
  flash: (m: string) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockItems, setStockItems] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [truckStockItemId, setTruckStockItemId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [prods, fullTemplates] = await Promise.all([
          api.listProducts(),
          Promise.all(templates.map((t) => api.getTemplate(t.id).catch(() => t))),
        ]);
        setProducts(prods);
        const items: { id: string; label: string }[] = [];
        for (const t of fullTemplates) {
          for (const it of t.items ?? []) {
            if (it.id) items.push({ id: it.id, label: `${t.name} · ${it.productName}` });
          }
        }
        setStockItems(items);
      } catch {
        /* surfaced on submit */
      } finally {
        setLoading(false);
      }
    })();
  }, [templates]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!productId || !truckStockItemId || quantity < 1) {
      return setErr("Choose a product, a truck item, and a quantity.");
    }
    setBusy(true);
    try {
      await api.transferToTruck({ productId, truckStockItemId, quantity: Number(quantity) });
      flash("Stock transferred to truck");
      setQuantity(1);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;

  if (stockItems.length === 0) {
    return (
      <EmptyState
        title="Nothing to transfer into"
        description="Create a stock template with items first, then you can move warehouse stock onto a truck."
      />
    );
  }

  return (
    <div className="card max-w-xl p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <ArrowRightLeft size={18} className="text-brand-600" /> Transfer warehouse stock to a truck
      </h2>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Warehouse product *</label>
          <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
            <option value="" disabled>Select a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({productQuantity(p)} in stock)
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p className="mt-1 text-xs text-ink-400">{productQuantity(selectedProduct)} available in warehouse</p>
          )}
        </div>
        <div>
          <label className="label">Truck stock item *</label>
          <select className="input" value={truckStockItemId} onChange={(e) => setTruckStockItemId(e.target.value)} required>
            <option value="" disabled>Select a truck item…</option>
            {stockItems.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Quantity *</label>
          <input
            type="number"
            min={1}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            required
          />
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
          Transfer
        </button>
      </form>
    </div>
  );
}

/* ----------------------------- Shared ----------------------------- */

function ModalShell({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-6">
      <div
        className={
          "w-full rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl " +
          (wide ? "max-w-2xl" : "max-w-md")
        }
      >
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
