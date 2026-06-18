import { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/**
 * Phase-aware Next config.
 *
 * The browser bundle talks to the API at NEXT_PUBLIC_API_BASE_URL. We fail the *production
 * build* when it is missing rather than silently shipping a bundle pointed at localhost —
 * but we do not block `next lint` / `next dev`, which also load this config.
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
export default function nextConfig(phase) {
  const isBuild = phase === PHASE_PRODUCTION_BUILD;
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;
  // `next lint` also loads the config under the build phase; don't block linting on env.
  const isLint = process.env.npm_lifecycle_event === "lint";

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (isBuild && !isLint && !apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is required for a production build. " +
        "Set it to your API origin (e.g. https://api.example.com) before running `next build`.",
    );
  }
  const apiOrigin = apiBaseUrl ?? "http://localhost:3000";

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
      // Only optimize images served over HTTPS from the configured API host.
      remotePatterns: apiBaseUrl
        ? [{ protocol: "https", hostname: new URL(apiOrigin).hostname }]
        : [{ protocol: "https", hostname: "**" }],
    },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  };
}
