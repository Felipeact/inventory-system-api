/**
 * @file billing.config.ts
 * @description Maps self-serve plans to their Stripe Price IDs and the entitlement
 * limits applied to a company when that plan becomes active. Keep the limits in sync
 * with web/src/lib/plans.ts. Only PRO and BUSINESS are sold self-serve through Stripe;
 * STARTER is the free fallback and ENTERPRISE is contact-sales (set via super-admin).
 */

import { env } from '../../config/env';

export interface PlanConfig {
  /** Stripe recurring per-seat Price ID (empty until configured in env). */
  priceId: string;
  maxUsers: number;
  maxProducts: number;
}

/** Effectively-unlimited ceiling for higher tiers (kept finite for the limit checks). */
const UNLIMITED = 1_000_000;

/** Limits applied to a company when it drops to / starts on the free tier. */
export const STARTER_LIMITS = { maxUsers: 3, maxProducts: 100 };

/** Plans purchasable via Stripe Checkout, keyed by uppercase plan name. */
export const SELF_SERVE_PLANS: Record<string, PlanConfig> = {
  PRO: {
    priceId: env.STRIPE_PRICE_PRO,
    maxUsers: 25,
    maxProducts: UNLIMITED,
  },
  BUSINESS: {
    priceId: env.STRIPE_PRICE_BUSINESS,
    maxUsers: UNLIMITED,
    maxProducts: UNLIMITED,
  },
};

/** Reverse lookup: Stripe Price ID → plan name (for webhook handling). */
export function planForPriceId(priceId: string | null | undefined): string | null {
  if (!priceId) return null;
  for (const [plan, cfg] of Object.entries(SELF_SERVE_PLANS)) {
    if (cfg.priceId && cfg.priceId === priceId) return plan;
  }
  return null;
}
