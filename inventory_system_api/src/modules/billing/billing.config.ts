/**
 * @file billing.config.ts
 * @description Maps self-serve plans to their Stripe Price IDs. The entitlement limits
 * (max users / products) come from the central plan catalog (config/plans.ts) so they
 * stay in sync everywhere. Only the Stripe Price IDs live here, sourced from env.
 * ENTERPRISE is contact-sales (set via super-admin); there is no free tier.
 */

import { env } from '../../config/env';
import { PLAN_CATALOG, SELF_SERVE_PLAN_KEYS, planDef } from '../../config/plans';

export interface PlanConfig {
  /** Stripe recurring flat-monthly Price ID (empty until configured in env). */
  priceId: string;
  maxUsers: number;
  maxProducts: number;
}

/** Stripe Price ID per self-serve plan, from env. */
const PRICE_IDS: Record<string, string> = {
  STARTER: env.STRIPE_PRICE_STARTER,
  PRO: env.STRIPE_PRICE_PRO,
  BUSINESS: env.STRIPE_PRICE_BUSINESS,
};

/** Plans purchasable via Stripe Checkout, keyed by uppercase plan name. */
export const SELF_SERVE_PLANS: Record<string, PlanConfig> = Object.fromEntries(
  SELF_SERVE_PLAN_KEYS.map((key) => {
    const def = PLAN_CATALOG[key];
    return [key, { priceId: PRICE_IDS[key] ?? '', maxUsers: def.maxUsers, maxProducts: def.maxProducts }];
  }),
);

/** Reverse lookup: Stripe Price ID → plan name (for webhook handling). */
export function planForPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  for (const [plan, cfg] of Object.entries(SELF_SERVE_PLANS)) {
    if (cfg.priceId && cfg.priceId === priceId) return plan;
  }
  return null;
}

/** Re-export for callers that just need a plan's limits by key. */
export { planDef };
