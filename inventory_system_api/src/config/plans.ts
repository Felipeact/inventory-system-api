/**
 * @file plans.ts
 * @description Single source of truth for the subscription plan catalog: per-seat
 * price, entitlement limits (max users / products), and whether the AI assistant is
 * included. Everything else (activation codes, company plan changes, Stripe billing
 * limits, revenue analytics, AI gating) derives from here, so picking a plan
 * automatically sets the right limits and features — nothing is entered by hand.
 *
 * Keep in sync with web/src/lib/plans.ts (the marketing/pricing copy).
 */

/** Effectively-unlimited ceiling (kept finite so the limit checks stay simple). */
export const UNLIMITED = 1_000_000;

export interface PlanDef {
  key: string;
  name: string;
  /** Monthly price per seat (USD). null = custom / contact-sales. */
  pricePerSeat: number | null;
  maxUsers: number;
  maxProducts: number;
  /** Whether the in-app AI assistant is included on this plan. */
  aiEnabled: boolean;
}

/**
 * The four tiers. Starter is the paid entry plan (no AI, small caps); AI is included
 * from Pro upward. Prices are per active user, per month.
 */
export const PLAN_CATALOG: Record<string, PlanDef> = {
  STARTER: {
    key: 'STARTER',
    name: 'Starter',
    pricePerSeat: 24,
    maxUsers: 5,
    maxProducts: 250,
    aiEnabled: false,
  },
  PRO: {
    key: 'PRO',
    name: 'Pro',
    pricePerSeat: 39,
    maxUsers: 25,
    maxProducts: UNLIMITED,
    aiEnabled: true,
  },
  BUSINESS: {
    key: 'BUSINESS',
    name: 'Business',
    pricePerSeat: 59,
    maxUsers: UNLIMITED,
    maxProducts: UNLIMITED,
    aiEnabled: true,
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    pricePerSeat: null,
    maxUsers: UNLIMITED,
    maxProducts: UNLIMITED,
    aiEnabled: true,
  },
};

/** Plans purchasable directly through Stripe checkout (Enterprise is contact-sales). */
export const SELF_SERVE_PLAN_KEYS = ['STARTER', 'PRO', 'BUSINESS'] as const;

/** Valid plan keys for validation/UI. */
export const PLAN_KEYS = Object.keys(PLAN_CATALOG);

/** Resolve a plan definition, defaulting to Starter for unknown/empty values. */
export function planDef(plan?: string | null): PlanDef {
  const key = String(plan ?? '').toUpperCase();
  return PLAN_CATALOG[key] ?? PLAN_CATALOG.STARTER;
}

/** Whether a plan includes the AI assistant. */
export function planAllowsAi(plan?: string | null): boolean {
  return planDef(plan).aiEnabled;
}
