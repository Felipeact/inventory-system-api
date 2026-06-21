/**
 * Pricing plan definitions (styled after the GitHub Copilot plans page).
 * Maps loosely to the backend `plan` tiers (PRO, BUSINESS, ENTERPRISE) and their
 * maxUsers / maxProducts limits. There is no free tier — every plan is paid.
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
    id: "pro",
    name: "Pro",
    tagline: "For growing field-service teams.",
    priceMonthly: 29,
    priceAnnual: 24,
    unit: "per user / month",
    cta: { label: "Start Pro", href: "/request-demo?plan=pro" },
    limits: { users: "Up to 25 users", products: "Unlimited products" },
    included: [
      "Real-time inventory & barcode scan-in / scan-out",
      "Asset register & low-stock thresholds",
      "Truck-stock templates & assignments",
      "Technician mobile app (iOS & Android)",
      "Receipt upload & reconciliation",
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

/** Feature comparison matrix rows for the pricing table (Pro · Business · Enterprise). */
export interface CompareRow {
  feature: string;
  values: [string | boolean, string | boolean, string | boolean];
}

export interface CompareSection {
  category: string;
  rows: CompareRow[];
}

export const COMPARISON: CompareSection[] = [
  {
    category: "Inventory",
    rows: [
      { feature: "Products", values: ["Unlimited", "Unlimited", "Unlimited"] },
      { feature: "Barcode scan in / out", values: [true, true, true] },
      { feature: "Locations / warehouses", values: ["5", "Unlimited", "Unlimited"] },
      { feature: "Low-stock thresholds", values: [true, true, true] },
    ],
  },
  {
    category: "Truck stock",
    rows: [
      { feature: "Stock templates", values: [true, true, true] },
      { feature: "Truck assignments", values: [true, true, true] },
      { feature: "Technician mobile app", values: [true, true, true] },
      { feature: "Receipt reconciliation", values: [true, true, true] },
    ],
  },
  {
    category: "Team & governance",
    rows: [
      { feature: "Seats included", values: ["25", "Unlimited", "Unlimited"] },
      { feature: "Role-based access control", values: [false, true, true] },
      { feature: "Audit logs", values: [false, true, true] },
      { feature: "SSO / SAML", values: [false, false, true] },
    ],
  },
  {
    category: "Reporting & support",
    rows: [
      { feature: "PDF / Excel exports", values: [true, true, true] },
      { feature: "Scheduled reports", values: [false, true, true] },
      { feature: "Support", values: ["Email", "Priority", "Dedicated CSM"] },
      { feature: "Uptime SLA", values: [false, false, "99.9%"] },
    ],
  },
];

export const FAQS = [
  {
    q: "How does per-user pricing work?",
    a: "You're billed for active users (admins, dispatchers, and technicians). Add or remove seats anytime — changes are prorated to your billing cycle.",
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
  {
    q: "Is there an activation code required to sign up?",
    a: "Self-serve signups use an activation code tied to your plan. Request a demo or contact sales and we'll issue one for your company.",
  },
];
