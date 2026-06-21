/**
 * Pricing plan definitions (styled after the GitHub Copilot plans page).
 * Mirrors the backend plan catalog (inventory_system_api/src/config/plans.ts):
 * four paid tiers, the cheapest (Starter) without the AI assistant, AI included
 * from Pro upward. Keep prices/limits in sync with that catalog.
 */
export interface Plan {
  id: string;
  name: string;
  tagline: string;
  priceMonthly: number | null; // null = custom/contact sales
  priceAnnual: number | null;
  unit: string;
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
    priceMonthly: 24,
    priceAnnual: 20,
    unit: "per user / month",
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
    priceMonthly: 39,
    priceAnnual: 32,
    unit: "per user / month",
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
    priceMonthly: 59,
    priceAnnual: 49,
    unit: "per user / month",
    badge: "Best value",
    highlighted: true,
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
  { maxUsers: number; maxProducts: number; ai: boolean; pricePerSeat: number | null }
> = {
  STARTER: { maxUsers: 5, maxProducts: 250, ai: false, pricePerSeat: 24 },
  PRO: { maxUsers: 25, maxProducts: Infinity, ai: true, pricePerSeat: 39 },
  BUSINESS: { maxUsers: Infinity, maxProducts: Infinity, ai: true, pricePerSeat: 59 },
  ENTERPRISE: { maxUsers: Infinity, maxProducts: Infinity, ai: true, pricePerSeat: null },
};

/** Format a limit number for display ("Unlimited" for the effectively-unlimited ceiling). */
export function formatLimit(n: number): string {
  return !Number.isFinite(n) || n >= 1_000_000 ? "Unlimited" : String(n);
}

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
    q: "How does per-user pricing work?",
    a: "You're billed for active users (admins, dispatchers, and technicians). Add or remove seats anytime — changes are prorated to your billing cycle.",
  },
  {
    q: "Which plans include the AI assistant?",
    a: "The AI assistant — which answers questions, builds reports, and takes actions for you — is included on Pro, Business, and Enterprise. The Starter plan does not include AI.",
  },
  {
    q: "Do technicians need a paid seat?",
    a: "Yes, each technician using the mobile app counts as a user. The Business and Enterprise plans include unlimited users so you can roll out to the whole crew at a flat rate.",
  },
  {
    q: "Can I try StockPilot before committing?",
    a: "Request a personalized demo and we'll set up a guided trial with sample data for your trade, so you can see it in action before you subscribe.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "Your data is yours. Export everything to PDF/Excel at any time, and we retain it for 30 days after cancellation so you can come back without losing history.",
  },
];
