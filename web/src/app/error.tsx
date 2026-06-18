"use client";

/**
 * Route-segment error boundary. Catches uncaught render/data errors anywhere under the
 * root layout and shows a branded recovery screen instead of the default Next.js overlay.
 */
import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for client-side observability (Sentry/console).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          Something went wrong
        </p>
        <h1 className="text-3xl font-bold text-slate-900">We hit an unexpected error</h1>
        <p className="max-w-md text-slate-600">
          The page failed to load. You can try again, and if the problem persists please
          contact support.
        </p>
        {error.digest ? (
          <p className="text-xs text-slate-400">Reference: {error.digest}</p>
        ) : null}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
