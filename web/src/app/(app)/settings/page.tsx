"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, KeyRound, Check } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useAuth, roleIsAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/app/ui";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div>
      <PageHeader title="Settings" description="Your profile and security." />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="card p-6">
          <h2 className="text-base font-semibold text-ink-900">Profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Name" value={user?.name || "—"} />
            <Row label="Email" value={user?.email || "—"} />
            <Row label="Role" value={`${user?.role || "—"}${roleIsAdmin(user?.role) ? " (Admin)" : ""}`} />
          </dl>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="btn-secondary mt-6"
          >
            <LogOut size={16} /> Sign out
          </button>
        </section>

        {/* Change password */}
        <section className="card p-6">
          <ChangePassword />
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setDone(false);
    if (next.length < 6) return setErr("New password must be at least 6 characters.");
    if (next !== confirm) return setErr("New password and confirmation do not match.");
    setBusy(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <KeyRound size={18} className="text-brand-600" /> Change password
      </h2>
      <form onSubmit={submit} className="mt-4 grid max-w-xl gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Current</label>
          <input type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="label">New</label>
          <input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <div>
          <label className="label">Confirm</label>
          <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {err && <p className="sm:col-span-3 text-sm font-medium text-red-600">{err}</p>}
        {done && (
          <p className="sm:col-span-3 flex items-center gap-1.5 text-sm font-medium text-green-600">
            <Check size={15} /> Password updated.
          </p>
        )}
        <div className="sm:col-span-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Update password
          </button>
        </div>
      </form>
    </>
  );
}
