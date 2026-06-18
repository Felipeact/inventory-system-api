"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { superAdminApi, ApiError } from "@/lib/api";

/** Super-admin (platform operator) sign-in. Separate from company-user login. */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await superAdminApi.login(email, password);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2 text-brand-600">
          <ShieldCheck size={22} />
          <span className="font-semibold">Platform Admin</span>
        </div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-ink-900">Operator sign-in</h1>
          <p className="mt-2 text-sm text-ink-500">
            Manage activation codes and company tenants.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Signing in…</>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          First time here?{" "}
          <Link href="/admin/setup" className="font-semibold text-brand-600 hover:text-brand-700">
            Run first-time setup
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
