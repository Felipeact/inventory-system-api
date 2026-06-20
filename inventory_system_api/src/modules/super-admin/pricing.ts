/**
 * @file pricing.ts
 * @description Platform pricing model used to derive revenue from companies. Mirrors the
 * marketing pricing in web/src/lib/plans.ts. The per-seat prices here are the monthly
 * list prices; a company may also carry a flat `monthlyPriceOverride` (custom/Enterprise
 * deals) which takes precedence over per-seat pricing.
 *
 * Keep this in sync with web/src/lib/plans.ts when prices change.
 */

/** Monthly list price per active user, per plan. `null` = custom (no list price). */
export const PLAN_MONTHLY_PRICE_PER_SEAT: Record<string, number | null> = {
  STARTER: 0,
  PRO: 29,
  BUSINESS: 59,
  ENTERPRISE: null,
};

/** Normalize an arbitrary plan string to a known key (defaults to STARTER). */
function planKey(plan: string | null | undefined): string {
  const key = String(plan ?? '').toUpperCase();
  return key in PLAN_MONTHLY_PRICE_PER_SEAT ? key : 'STARTER';
}

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
  const pricePerSeat = PLAN_MONTHLY_PRICE_PER_SEAT[planKey(plan)];
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
