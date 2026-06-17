"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.requestReset(email);
    } catch {
      /* The API intentionally does not reveal whether an email exists. */
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-green-100 text-green-600">
          <MailCheck size={30} />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-ink-500">
          If an account exists for <span className="font-medium text-ink-700">{email}</span>,
          you'll receive a password reset link shortly.
        </p>
        <Link href="/login" className="btn-secondary mt-8 w-full py-3">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-ink-900">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-500">
        Enter your email and we'll send you a reset link.
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
