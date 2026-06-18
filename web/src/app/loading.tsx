/**
 * Root-level streaming fallback shown while a route segment loads.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
