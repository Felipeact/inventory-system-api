import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * Phase-aware Next config.
 *
 * The browser bundle talks to the API at NEXT_PUBLIC_API_BASE_URL. When that is unset or
 * invalid we fall back to the live production API (see DEFAULT_API_BASE_URL) so the app
 * works with zero configuration rather than silently pointing at localhost.
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
export default function nextConfig(phase) {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  /**
   * Resolve the API origin used for CSP `connect-src` and image optimization.
   * Defends against unset/empty/"undefined"/"null" env values and falls back to
   * the live API, so a missing or garbled .env never breaks the build, throws on
   * `new URL(...)`, or points the bundle at the wrong host.
   */
  const DEFAULT_API_BASE_URL = "https://inventory-system-api-production.up.railway.app";
  const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const apiOrigin =
    !rawApiBaseUrl || rawApiBaseUrl === "undefined" || rawApiBaseUrl === "null"
      ? DEFAULT_API_BASE_URL
      : rawApiBaseUrl.replace(/\/$/, "");

  /**
   * Content-Security-Policy. `'unsafe-inline'` is required because Next.js injects inline
   * hydration scripts/styles without a nonce; `'unsafe-eval'` and ws: are only added in dev
   * for React Fast Refresh. `connect-src` is widened to the configured API origin.
   */
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${apiOrigin}${isDev ? " ws: http://localhost:*" : ""}`,
    "upgrade-insecure-requests",
  ].join("; ");

  const securityHeaders = [
    { key: "Content-Security-Policy", value: csp },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "X-DNS-Prefetch-Control", value: "on" },
  ];

  return {
    reactStrictMode: true,
    // Don't advertise the framework/version in responses.
    poweredByHeader: false,
    // Emit a self-contained server bundle for slim container/Node deploys.
    output: "standalone",
    images: {
      // Only optimize images served over HTTPS from the resolved API host.
      remotePatterns: [{ protocol: "https", hostname: new URL(apiOrigin).hostname }],
    },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  };
}
