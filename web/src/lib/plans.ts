/**
 * Pricing plan definitions (styled after the GitHub Copilot plans page).
 * Mirrors the backend plan catalog (inventory_system_api/src/config/plans.ts):
 * four paid tiers at a FLAT monthly price (not per-seat), the cheapest (Starter)
 * without the AI assistant, AI included from Pro upward. User counts are caps, not
 * billing multipliers. Keep prices/limits in sync with that catalog.
 */
export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number | null; // null = custom/contact sales
  priceAnnual: number | null;
  unit: string;
  /** One-time implementation / onboarding fee (USD). null = custom. */
  onboardingFee: number | null;
  badge?: string;
  highlighted?: boolean;
  cta: { label: string; href: string };
  included: string[];
  limits: { users: string; products: string };
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For small crews getting organized.",
    priceMonthly: 199,
    priceAnnual: 166,
    unit: "flat / month",
    onboardingFee: 500,
    cta: { label: "Start Starter", href: "/request-demo?plan=starter" },
    limits: { users: "Up to 5 users", products: "Up to 250 products" },
    included: [
      "Real-time inventory & barcode scan-in / scan-out",
      "Asset register & low-stock thresholds",
      "Truck-stock templates & assignments",
      "Technician mobile app (iOS & Android)",
      "Up to 5 users · 250 products",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing field-service teams.",
    priceMonthly: 499,
    priceAnnual: 416,
    unit: "flat / month",
    onboardingFee: 1500,
    badge: "Most popular",
    highlighted: true,
    cta: { label: "Start Pro", href: "/request-demo?plan=pro" },
    limits: { users: "Up to 25 users", products: "Unlimited products" },
    included: [
      "Everything in Starter",
      "AI assistant — ask, report & take actions",
      "Receipt upload & reconciliation",
      "Low-stock alerts across trucks",
      "Unlimited products",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For multi-truck operations at scale.",
    priceMonthly: 999,
    priceAnnual: 833,
    unit: "flat / month",
    onboardingFee: 3000,
    cta: { label: "Request a demo", href: "/request-demo?plan=business" },
    limits: { users: "Unlimited users", products: "Unlimited products" },
    included: [
      "Everything in Pro",
      "Role-based access control (RBAC)",
      "PDF & Excel reporting / exports",
      "Audit logging",
      "Priority email & chat support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For organizations with advanced needs.",
    priceMonthly: null,
    priceAnnual: null,
    unit: "custom pricing",
    onboardingFee: null,
    cta: { label: "Contact sales", href: "/request-demo?plan=enterprise" },
    limits: { users: "Unlimited users", products: "Unlimited products" },
    included: [
      "Everything in Business",
      "SSO / SAML & SCIM provisioning",
      "Dedicated success manager",
      "Custom integrations & API limits",
      "99.9% uptime SLA",
    ],
  },
];

/**
 * Plan entitlement limits, mirroring the backend catalog. Used by the operator
 * console to show the caps that a plan auto-applies (no manual entry).
 * `Infinity` renders as "Unlimited".
 */
export const PLAN_LIMITS: Record<
  string,
  {
    maxUsers: number;
    maxProducts: number;
    ai: boolean;
    /** Flat monthly price for the plan (USD). null = custom. */
    priceMonthly: number | null;
    onboardingFee: number | null;
  }
> = {
  STARTER: { maxUsers: 5, maxProducts: 250, ai: false, priceMonthly: 199, onboardingFee: 500 },
  PRO: { maxUsers: 25, maxProducts: Infinity, ai: true, priceMonthly: 499, onboardingFee: 1500 },
  BUSINESS: { maxUsers: Infinity, maxProducts: Infinity, ai: true, priceMonthly: 999, onboardingFee: 3000 },
  ENTERPRISE: { maxUsers: Infinity, maxProducts: Infinity, ai: true, priceMonthly: null, onboardingFee: null },
};

/** Format a limit number for display ("Unlimited" for the effectively-unlimited ceiling). */
export function formatLimit(n: number): string {
  return !Number.isFinite(n) || n >= 1_000_000 ? "Unlimited" : String(n);
}

/** The self-serve flat plans (Starter · Pro · Business) for the "what teams spend" table. */
export const FLAT_PLAN_SUMMARY: { name: string; price: number; cap: string }[] = [
  { name: "Starter", price: 199, cap: "up to 5 users" },
  { name: "Pro", price: 499, cap: "up to 25 users" },
  { name: "Business", price: 999, cap: "unlimited users" },
];

/** Feature comparison matrix rows for the pricing table (Starter · Pro · Business · Enterprise). */
export interface CompareRow {
  feature: string;
  values: [string | boolean, string | boolean, string | boolean, string | boolean];
}

export interface CompareSection {
  category: string;
  rows: CompareRow[];
}

export const COMPARISON: CompareSection[] = [
  {
    category: "Inventory",
    rows: [
      { feature: "Products", values: ["250", "Unlimited", "Unlimited", "Unlimited"] },
      { feature: "Barcode scan in / out", values: [true, true, true, true] },
      { feature: "Locations / warehouses", values: ["1", "5", "Unlimited", "Unlimited"] },
      { feature: "Low-stock thresholds", values: [true, true, true, true] },
    ],
  },
  {
    category: "Truck stock",
    rows: [
      { feature: "Stock templates", values: [true, true, true, true] },
      { feature: "Truck assignments", values: [true, true, true, true] },
      { feature: "Technician mobile app", values: [true, true, true, true] },
      { feature: "Receipt reconciliation", values: [false, true, true, true] },
    ],
  },
  {
    category: "AI & automation",
    rows: [
      { feature: "AI assistant (ask, report, act)", values: [false, true, true, true] },
    ],
  },
  {
    category: "Team & governance",
    rows: [
      { feature: "Seats included", values: ["5", "25", "Unlimited", "Unlimited"] },
      { feature: "Role-based access control", values: [false, false, true, true] },
      { feature: "Audit logs", values: [false, false, true, true] },
      { feature: "SSO / SAML", values: [false, false, false, true] },
    ],
  },
  {
    category: "Reporting & support",
    rows: [
      { feature: "PDF / Excel exports", values: [false, true, true, true] },
      { feature: "Scheduled reports", values: [false, false, true, true] },
      { feature: "Support", values: ["Email", "Email", "Priority", "Dedicated CSM"] },
      { feature: "Uptime SLA", values: [false, false, false, "99.9%"] },
    ],
  },
];

export const FAQS = [
  {
    q: "How does pricing work?",
    a: "Each plan is one flat monthly price — not per user. You pick the plan that fits your team size (each plan includes a user limit), and the price stays the same whether you add 1 user or fill the plan.",
  },
  {
    q: "Which plans include the AI assistant?",
    a: "The AI assistant — which answers questions, builds reports, and takes actions for you — is included on Pro, Business, and Enterprise. The Starter plan does not include AI.",
  },
  {
    q: "What happens if I outgrow my plan's user limit?",
    a: "Just move up a plan — it's a flat price change, and the new user and product limits apply immediately. Business and Enterprise include unlimited users so you can roll out to the whole crew.",
  },
  {
    q: "Can I try Stockvio before committing?",
    a: "Request a personalized demo and we'll set up a guided trial with sample data for your trade, so you can see it in action before you subscribe.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data is yours. Export everything to PDF/Excel at any time. After cancellation your data is preserved so you can reactivate without losing history — and you can ask us to permanently delete it whenever you want.",
  },
];
