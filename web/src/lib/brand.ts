/**
 * Central brand configuration. Change these in one place to re-skin the whole site.
 */
export const BRAND = {
  name: "Stockvio",
  tagline: "Inventory & truck-stock management for field service teams",
  description:
    "Stockvio keeps your warehouse, technicians, and trucks in sync — real-time inventory, barcode scanning, truck-stock templates, receipt reconciliation, and reporting in one platform.",
  salesEmail: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "sales@stockvio.app",
  social: {
    twitter: "https://twitter.com",
    linkedin: "https://linkedin.com",
    github: "https://github.com",
  },
} as const;

/** Navigation links for the marketing header. */
export const MARKETING_NAV = [
  { label: "Product", href: "/#product" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Customers", href: "/#customers" },
] as const;
