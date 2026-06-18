"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { superAdminApi, ApiError } from "@/lib/api";

/**
 * One-time bootstrap of the first platform super-admin. Requires the
 * SUPER_ADMIN_BOOTSTRAP_SECRET configured on the API. After the first admin
 * exists, the endpoint is closed and this page returns a clear error.
 */
export default function AdminSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", bootstrapSecret: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await superAdminApi.create(form.email, form.password, form.bootstrapSecret);
      setDone(true);
      // Log straight in so the operator lands on the dashboard.
      await superAdminApi.login(form.email, form.password);
      router.push("/admin");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not create the super-admin.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-brand-600">
          <ShieldCheck size={22} />
          <span className="font-semibold">Platform Admin · First-run setup</span>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-ink-900">
            Create the first super-admin
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            This is a one-time step. It requires the{" "}
            <code className="font-mono text-xs">SUPER_ADMIN_BOOTSTRAP_SECRET</code> set on the
            API. Once an admin exists, this page is disabled.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Super-admin email</label>
              <input
                id="email"
                type="email"
                className="input"
                value={form.email}
                onChange={update("email")}
                placeholder="owner@yourcompany.com"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                value={form.password}
                onChange={update("password")}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="bootstrapSecret">Bootstrap secret</label>
              <input
                id="bootstrapSecret"
                type="password"
                className="input font-mono"
                value={form.bootstrapSecret}
                onChange={update("bootstrapSecret")}
                placeholder="SUPER_ADMIN_BOOTSTRAP_SECRET value"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || done} className="btn-primary w-full py-3">
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Creating…</>
              ) : (
                "Create super-admin"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already set up?{" "}
          <Link href="/admin/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
        <p className="mt-3 text-center">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-600">
            <ArrowLeft size={14} /> Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
