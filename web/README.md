# Stockvio — Web (`inventory-system-web`)

Marketing site **and** authenticated web dashboard for the Stockvio Inventory &
Truck-Stock platform. Built with **Next.js 15 (App Router)**, **TypeScript**, and
**Tailwind CSS**, talking to the [`inventory-system-api`](../) backend.

> Lives in the `web/` folder of the `inventory-system-api` repo. It can be split
> into its own repository at any time — see [Extracting to its own repo](#extracting-to-its-own-repo).

## What's inside

### Marketing site (public)
| Route | Description |
| ----- | ----------- |
| `/` | Landing page — hero, logo cloud, feature grid, how-it-works, stats, testimonials, CTA |
| `/features` | Feature deep-dives for inventory, truck stock, receipts, and reporting |
| `/pricing` | GitHub-Copilot-style tiered plans, billing toggle, platform list, full comparison table, FAQ |
| `/request-demo` | BuildOps-style "request a personal demo" page with a qualified lead form + social proof |

### Web app (authenticated)
| Route | Description |
| ----- | ----------- |
| `/login`, `/register`, `/forgot-password` | JWT auth against `/auth/*` |
| `/dashboard` | KPIs, top-products chart (Recharts), and a low-stock list |
| `/products` | Searchable catalog, add product, quick **scan-in / scan-out**, delete |
| `/assets` | Asset register with add/delete |
| `/trucks` | Fleet and truck-stock templates |
| `/reports` | Inventory & asset summaries + CSV / Excel / PDF exports |
| `/settings` | Profile, API connection, change password, sign out |

## Getting started

```bash
cd web
cp .env.example .env.local      # point NEXT_PUBLIC_API_BASE_URL at your API
npm install
npm run dev                     # http://localhost:3000
```

> The API runs on port 3000 by default too. Either run the web app on another
> port (`npm run dev -- -p 3001`) or point `NEXT_PUBLIC_API_BASE_URL` at a
> deployed API. Remember to add the web origin to the API's `CORS_ORIGINS`.

### Scripts
| Script | Purpose |
| ------ | ------- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (next/core-web-vitals) |

## Configuration

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the Inventory System API (no trailing slash). Read in the browser. |
| `NEXT_PUBLIC_SALES_EMAIL` | Contact address shown on the demo page. |

## Architecture notes

- **Auth** is stateless bearer-token. `src/lib/api.ts` stores the access/refresh
  tokens in `localStorage`, injects `Authorization: Bearer`, and transparently
  refreshes once on a `401` before retrying. `src/lib/auth.tsx` exposes a React
  context (`useAuth`).
- **Route groups** separate concerns without affecting URLs: `(marketing)` (public
  chrome), `(auth)` (centered split layout), `(app)` (sidebar shell with a client
  auth guard that redirects to `/login`).
- **Branding** is centralized in `src/lib/brand.ts`; **plan/pricing data** in
  `src/lib/plans.ts`. Change copy and tiers there without touching components.
- The demo form has no public intake endpoint on the API yet, so it simulates the
  submission (logs the payload). Wire it to your CRM or a `/leads` route when ready.

## Deploying

Deploy anywhere that runs Next.js (Vercel, Netlify, a Node container). Set
`NEXT_PUBLIC_API_BASE_URL` at **build time** (it's inlined into the client bundle),
and add the deployed origin to the API's `CORS_ORIGINS`.

## Extracting to its own repo

This project is self-contained in `web/`. To move it to a standalone repo:

```bash
# from the inventory-system-api repo root
git subtree split --prefix=web -b web-only
# create an empty repo on GitHub, then:
git push git@github.com:<you>/inventory-system-web.git web-only:main
```
