import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vantori.app";

/**
 * robots.txt — allow crawling of marketing pages, keep the authenticated app and auth
 * flows out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/products",
        "/assets",
        "/trucks",
        "/reports",
        "/settings",
        "/login",
        "/register",
        "/forgot-password",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
