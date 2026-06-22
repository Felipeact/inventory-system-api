/**
 * @file pricing.ts
 * @description Derives company revenue from the central plan catalog (config/plans.ts).
 * Plans are billed at a FLAT monthly price (not per seat); a company may also carry a
 * flat `monthlyPriceOverride` (custom/Enterprise deals) which takes precedence.
 */

import { PLAN_CATALOG, planDef } from '../../config/plans';

/** Flat monthly list price per plan (from the catalog). `null` = custom. */
export const PLAN_MONTHLY_PRICE: Record<string, number | null> = Object.fromEntries(
  Object.values(PLAN_CATALOG).map((p) => [p.key, p.priceMonthly]),
);

export interface CompanyBilling {
  /** Flat list price for the plan, or null for custom-priced plans. */
  planPrice: number | null;
  /** The flat override in effect, if any. */
  monthlyPriceOverride: number | null;
  /** Contracted monthly revenue: override if set, else the plan's flat price. */
  monthlyRevenue: number;
  /** True when the plan is custom-priced and no override has been set yet. */
  needsPricing: boolean;
}

/**
 * Compute the monthly revenue a company represents from its plan and any custom
 * override. Plans bill at a flat price regardless of seat count. Custom-priced plans
 * with no override contribute $0 and are flagged so the operator sets a contract amount.
 */
export function computeCompanyBilling(
  plan: string | null | undefined,
  monthlyPriceOverride: number | null | undefined,
): CompanyBilling {
  const planPrice = planDef(plan).priceMonthly;
  const override =
    typeof monthlyPriceOverride === 'number' ? monthlyPriceOverride : null;

  if (override !== null) {
    return { planPrice, monthlyPriceOverride: override, monthlyRevenue: override, needsPricing: false };
  }

  if (planPrice === null) {
    return { planPrice, monthlyPriceOverride: null, monthlyRevenue: 0, needsPricing: true };
  }

  return {
    planPrice,
    monthlyPriceOverride: null,
    monthlyRevenue: planPrice,
    needsPricing: false,
  };
}
