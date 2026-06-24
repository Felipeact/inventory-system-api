"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type Granularity,
  type Period,
  currentPeriod,
  isFuturePeriod,
  periodLabel,
  shiftPeriod,
  withGranularity,
} from "@/lib/period";

/**
 * Month/year window picker with prev/next navigation. Lets the user move into
 * past and future periods and switch granularity. Controlled via `value`/`onChange`.
 */
export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (next: Period) => void;
}) {
  const future = isFuturePeriod(value);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center rounded-lg border border-ink-200 bg-white">
        <button
          type="button"
          aria-label="Previous period"
          onClick={() => onChange(shiftPeriod(value, -1))}
          className="grid h-9 w-9 place-items-center rounded-l-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-[8.5rem] px-2 text-center text-sm font-semibold text-ink-900">
          {periodLabel(value)}
        </span>
        <button
          type="button"
          aria-label="Next period"
          onClick={() => onChange(shiftPeriod(value, 1))}
          className="grid h-9 w-9 place-items-center rounded-r-lg text-ink-500 hover:bg-ink-50 hover:text-ink-900"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
        {(["month", "year"] as Granularity[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange(withGranularity(value, g))}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
              value.granularity === g
                ? "bg-brand-50 text-brand-700"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {g}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange(currentPeriod(value.granularity))}
        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
      >
        Today
      </button>

      {future && (
        <span className="text-xs font-medium text-ink-400">Upcoming period</span>
      )}
    </div>
  );
}
