"use client";

import { Loader2, AlertCircle, Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page header with title, optional description, and an action slot. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "brand" | "good";
  icon?: LucideIcon;
}) {
  const toneMap = {
    default: "text-ink-900",
    warn: "text-amber-600",
    brand: "text-brand-600",
    good: "text-green-600",
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon && <Icon size={18} className="text-ink-300" />}
      </div>
      <p className={cn("mt-2 text-3xl font-bold tracking-tight", toneMap[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warn" | "good" | "brand" | "muted";
}) {
  const toneMap = {
    default: "bg-ink-100 text-ink-700",
    warn: "bg-amber-100 text-amber-700",
    good: "bg-green-100 text-green-700",
    brand: "bg-brand-100 text-brand-700",
    muted: "bg-ink-100 text-ink-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        toneMap[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-20 text-ink-400">
      <Loader2 size={20} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-16 text-center">
      <AlertCircle size={28} className="text-red-500" />
      <p className="text-sm font-medium text-ink-700">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-1">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Inbox size={24} />
      </div>
      <p className="text-base font-semibold text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
