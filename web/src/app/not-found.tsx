/**
 * Branded 404 page shown for unmatched routes (App Router convention).
 */
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <p className="text-6xl font-black text-slate-900">404</p>
        <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="max-w-md text-slate-600">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Back to home
      </Link>
    </main>
  );
}
