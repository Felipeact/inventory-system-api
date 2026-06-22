"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="grid place-items-center py-20">
          <Loader2 size={22} className="animate-spin text-ink-400" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  // Prefill from a quote email link (…/register?code=…&companyName=…&email=…).
  const [form, setForm] = useState({
    companyName: params.get("companyName") ?? "",
    email: params.get("email") ?? "",
    password: "",
    code: params.get("code") ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to create account. Please try again.",
      );
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Create your account</h1>
      <p className="mt-2 text-sm text-ink-500">
        Set up your company workspace. You'll need an activation code —{" "}
        <Link href="/request-demo" className="font-medium text-brand-600">
          request one here
        </Link>
        .
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label" htmlFor="companyName">
            Company name
          </label>
          <input
            id="companyName"
            className="input"
            value={form.companyName}
            onChange={update("companyName")}
            placeholder="Cascade HVAC"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            placeholder="you@company.com"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="new-password"
            value={form.password}
            onChange={update("password")}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="code">
            Activation code
          </label>
          <input
            id="code"
            className="input font-mono"
            value={form.code}
            onChange={update("code")}
            placeholder="XXXX-XXXX-XXXX"
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
              <Loader2 size={18} className="animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
