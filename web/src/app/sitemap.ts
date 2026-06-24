import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://stockvio.app";

/** Public marketing routes included in the sitemap. */
const routes = ["", "/features", "/pricing", "/request-demo"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
