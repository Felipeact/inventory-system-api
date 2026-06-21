/**
 * @file pricing.ts
 * @description Derives company revenue from the central plan catalog (config/plans.ts).
 * The per-seat prices here come straight from that catalog; a company may also carry a
 * flat `monthlyPriceOverride` (custom/Enterprise deals) which takes precedence.
 */

import { PLAN_CATALOG, planDef } from '../../config/plans';

/** Monthly list price per active user, per plan (from the catalog). `null` = custom. */
export const PLAN_MONTHLY_PRICE_PER_SEAT: Record<string, number | null> = Object.fromEntries(
  Object.values(PLAN_CATALOG).map((p) => [p.key, p.pricePerSeat]),
);

export interface CompanyBilling {
  /** Per-seat list price for the plan, or null for custom-priced plans. */
  pricePerSeat: number | null;
  /** The flat override in effect, if any. */
  monthlyPriceOverride: number | null;
  /** Contracted monthly revenue: override if set, else seats × per-seat price. */
  monthlyRevenue: number;
  /** True when the plan is custom-priced and no override has been set yet. */
  needsPricing: boolean;
}

/**
 * Compute the monthly revenue a company represents from its plan, seat count, and any
 * custom override. Custom-priced plans with no override contribute $0 and are flagged
 * so the operator knows to set a contract amount.
 */
export function computeCompanyBilling(
  plan: string | null | undefined,
  seats: number,
  monthlyPriceOverride: number | null | undefined,
): CompanyBilling {
  const pricePerSeat = planDef(plan).pricePerSeat;
  const override =
    typeof monthlyPriceOverride === 'number' ? monthlyPriceOverride : null;

  if (override !== null) {
    return { pricePerSeat, monthlyPriceOverride: override, monthlyRevenue: override, needsPricing: false };
  }

  if (pricePerSeat === null) {
    return { pricePerSeat, monthlyPriceOverride: null, monthlyRevenue: 0, needsPricing: true };
  }

  return {
    pricePerSeat,
    monthlyPriceOverride: null,
    monthlyRevenue: pricePerSeat * Math.max(0, seats),
    needsPricing: false,
  };
}
