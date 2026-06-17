"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
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
      const user = await login(email, password);
      router.push(user.mustChangePassword ? "/settings?changePassword=1" : "/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to sign in. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-500">
        Sign in to your StockPilot dashboard.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Forgot?
            </Link>
          </div>
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

        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Don't have an account?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
          Create one
        </Link>
      </p>
    </div>
  );
}
