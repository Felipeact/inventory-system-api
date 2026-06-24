/**
 * Time-period helpers for the analytics views (tech spending, truck costs).
 * Supports month- or year-granularity windows that can be moved backward and
 * forward (including into the future, which simply yields empty results).
 */

export type Granularity = "month" | "year";

export interface Period {
  granularity: Granularity;
  /** Full year, e.g. 2026. */
  year: number;
  /** 0-11. Only meaningful when granularity === "month". */
  month: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The period containing today, at the given granularity. */
export function currentPeriod(granularity: Granularity): Period {
  const now = new Date();
  return { granularity, year: now.getFullYear(), month: now.getMonth() };
}

/** Move a period forward (delta > 0) or backward (delta < 0) by its unit. */
export function shiftPeriod(p: Period, delta: number): Period {
  if (p.granularity === "year") {
    return { ...p, year: p.year + delta };
  }
  const base = new Date(p.year, p.month + delta, 1);
  return { ...p, year: base.getFullYear(), month: base.getMonth() };
}

/** Switch granularity while keeping the same anchor date. */
export function withGranularity(p: Period, granularity: Granularity): Period {
  return { ...p, granularity };
}

/** Human label, e.g. "June 2026" or "2026". */
export function periodLabel(p: Period): string {
  return p.granularity === "year" ? String(p.year) : `${MONTHS[p.month]} ${p.year}`;
}

/** [start, end) date range covered by the period. */
export function periodRange(p: Period): { start: Date; end: Date } {
  if (p.granularity === "year") {
    return { start: new Date(p.year, 0, 1), end: new Date(p.year + 1, 0, 1) };
  }
  return { start: new Date(p.year, p.month, 1), end: new Date(p.year, p.month + 1, 1) };
}

/** True when an ISO date string falls within the period. */
export function inPeriod(dateIso: string | undefined | null, p: Period): boolean {
  if (!dateIso) return false;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return false;
  const { start, end } = periodRange(p);
  return d >= start && d < end;
}

/** True when the period is entirely after today (no data can exist yet). */
export function isFuturePeriod(p: Period): boolean {
  return periodRange(p).start > new Date();
}
