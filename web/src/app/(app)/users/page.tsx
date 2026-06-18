"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, X, Loader2, KeyRound, Trash2, Pencil, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { CompanyUser } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { PERMISSIONS, ROLES } from "@/lib/permissions";
import { PageHeader, Loading, ErrorState, EmptyState, Badge } from "@/components/app/ui";

const ROLE_OPTIONS = [ROLES.ADMIN, ROLES.WAREHOUSE, ROLES.TECHNICIAN];

export default function UsersPage() {
  const { user, hasPermission } = useAuth();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<CompanyUser | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const allowed = hasPermission(PERMISSIONS.MANAGE_USERS);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team.");
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

  async function handleReset(u: CompanyUser) {
    if (!confirm(`Reset password for ${u.email}? Their current sessions will be revoked.`)) return;
    try {
      const { temporaryPassword } = await api.resetUserPassword(u.id);
      setBanner(`Temporary password for ${u.email}: ${temporaryPassword}`);
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Reset failed");
    }
  }

  async function handleDelete(u: CompanyUser) {
    if (!confirm(`Remove ${u.email} from the team? This cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      flash("User removed");
    } catch (err) {
      flash(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  if (!allowed) {
    return (
      <div>
        <PageHeader title="Team" description="Manage your company's users." />
        <EmptyState
          title="No access"
          description="You don't have permission to manage team members."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite teammates and manage their roles."
        action={
          <button className="btn-primary" onClick={() => setShowInvite(true)}>
            <Plus size={16} /> Invite user
          </button>
        }
      />

      {banner && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">{banner}</span>
          <button className="btn-ghost p-1" onClick={() => setBanner(null)} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : users.length === 0 ? (
        <EmptyState title="No team members yet" description="Invite your first teammate to get started." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/60">
                    <td className="px-5 py-3.5 font-medium text-ink-900">{u.name || "—"}</td>
                    <td className="px-5 py-3.5 text-ink-600">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone="brand">{u.role?.name || "—"}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(u)}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleReset(u)}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                          aria-label="Reset password"
                          title="Reset password"
                        >
                          <KeyRound size={16} />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onDone={(msg) => {
            setShowInvite(false);
            if (msg) setBanner(msg);
            load();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            flash("User updated");
            load();
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

function InviteModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (banner: string | null) => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", role: ROLES.TECHNICIAN as string });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await api.inviteUser({
        name: form.name || undefined,
        email: form.email,
        role: form.role,
      });
      onDone(
        res.temporaryPassword
          ? `Invite created. Temporary password for ${form.email}: ${res.temporaryPassword}`
          : `Invite email sent to ${form.email}.`,
      );
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not invite user");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Invite user" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email *</label>
          <input
            type="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            Send invite
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: CompanyUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email,
    role: user.role?.name || ROLES.TECHNICIAN,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.updateUser(user.id, { name: form.name, email: form.email, role: form.role });
      onSaved();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not update user");
      setBusy(false);
    }
  }

  return (
    <ModalShell title="Edit user" onClose={onClose}>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-sm font-medium text-red-600">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            Save changes
          </button>
        </div>
      </form>
    </ModalShell>
  );
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
