# Inventory System API

This repository contains the Stockvio platform: a multi-tenant inventory, asset, and truck-stock management system for field-service operations, with a Node.js/Express API in `inventory_system_api/` and a Next.js frontend in `web/`.

The API is the source of truth for authentication, authorization, subscription checks, company tenant data, exports, AI usage, billing, and operational reporting. The frontend is a separate app that talks to the API over HTTP.

## Repository layout

```text
.
├── README.md
├── docs/
├── inventory_system_api/
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── jest.config.js
│   ├── openapi.json
│   ├── package.json
│   ├── prisma/
│   ├── railway.json
│   ├── src/
│   └── tests/
├── web/
│   ├── .env.example
│   ├── package.json
│   └── src/
└── .github/workflows/ci.yml
```

## What the project does

The backend implements a company-scoped SaaS platform with:

- Inventory tracking and stock movement records
- Asset management and lifecycle tracking
- Vehicle/truck stock templates, assignments, stock transfers, receipts, and item reconciliation
- RBAC based on roles and permissions per company
- Company registration through activation codes
- Super-admin management for activation codes, companies, pricing, and analytics
- Stripe billing integration with checkout, customer portal, and webhook processing
- AI assistant endpoints powered by Anthropic
- Daily scheduled jobs via a shared secret endpoint
- PDF/CSV/XLSX export endpoints
- Lead capture for demo requests
- Audit logging and reporting

The app is designed around a `Company` tenant model and scopes most records to `companyId`, so each company operates in an isolated data domain.

## Architecture and major components

### Backend

The Express application is created in `inventory_system_api/src/app.ts` and mounted at port `3000` by default. It exposes the public health endpoints, security middleware, CORS, request logging, file uploads, and route groups for the main modules:

- `/auth` — registration, login, refresh, logout, reset password, password change
- `/products` — product creation, listing, low-stock queries, scan-in/scan-out, updates
- `/assets` — asset CRUD
- `/users` — user management, permission assignment, profile updates, invites
- `/reports` — inventory and asset summaries, audit logs, stock movement reports
- `/exports` — CSV/XLSX/PDF exports for products, assets, users, and company JSON
- `/super-admin` — activation codes, company analytics, pricing overrides, quote pipeline, Stripe reconciliation
- `/truck-stock` — truck templates, assignments, item transfers, receipts, stock movements
- `/leads` — public demo/contact submission endpoint
- `/ai` — authenticated AI assistant status and chat endpoints
- `/billing` — Stripe status, checkout, and portal routes
- `/cron` — machine-to-machine daily jobs endpoint behind `x-cron-secret`
- `/health`, `/ready`, `/openapi.json`, `/updates/latest` — operational and metadata endpoints

### Data model

The Prisma schema in `inventory_system_api/prisma/schema.prisma` defines the core models, including:

- `Company`
- `User`
- `Role`
- `Permission`
- `Product`
- `Inventory`
- `Asset`
- `ActivationCode`
- `Quote`
- `RevenueSnapshot`
- `AiUsage`
- `AuditLog`
- `Truck`, `TruckStockTemplate`, `TruckStockAssignment`, `TruckStockMovement`, `PurchaseReceipt`

### Authentication and authorization

The app uses:

- JWT access tokens and refresh tokens
- `authMiddleware` for authenticated routes
- `subscriptionMiddleware` to require an active company subscription
- `requirePermission` with a permission catalog in `inventory_system_api/src/constants/permissions.ts`
- `RoleService` to assign default permissions for `ADMIN`, `WAREHOUSE`, and `TECHNICIAN`

### Storage and billing

The application supports multiple storage backends for uploaded receipts and files:

- `local` — file uploads in `UPLOAD_DIR`, served from `/uploads`
- `s3` — S3-compatible object storage
- `cloudinary` — Cloudinary-managed uploads

Billing is optional and uses Stripe when configured. The webhook endpoint is mounted at `/billing/webhook` before the JSON body parser so Stripe signatures can be validated against the raw payload.

## Tech stack

| Concern | Implementation |
| --- | --- |
| Runtime | Node.js 22 |
| Language | TypeScript |
| HTTP server | Express 5 |
| Database | PostgreSQL via Prisma ORM |
| Validation | Zod |
| Auth | JWT bearer tokens + refresh tokens |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Pino + pino-http |
| Email | Nodemailer and/or Resend |
| File storage | Local filesystem, S3, or Cloudinary |
| Billing | Stripe |
| AI | Anthropic Claude API |
| Exports | PDFKit, xlsx |
| Testing | Jest + Supertest |
| Frontend | Next.js 15 + React + Tailwind CSS |

## Requirements

Before running the backend you need:

- Node.js 22
- npm
- PostgreSQL 16 or compatible database
- Optional: Docker and Docker Compose

The repository includes a Docker setup for local API + PostgreSQL development in `inventory_system_api/docker-compose.yml`.

## Backend setup

From the repository root:

```bash
cd inventory_system_api
npm install
cp .env.example .env
```

Then edit `.env` with your local or deployment values.

### Required environment variables

The app validates environment variables in `inventory_system_api/src/config/env.ts` on startup. The process exits if required values are missing or invalid.

Core required variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/inventory?sslmode=disable
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
```

Other important variables:

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
FRONTEND_URL=http://localhost:3001
```

Optional but commonly used:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
RESEND_API_KEY=
RESEND_FROM=onboarding@resend.dev
ADMIN_NOTIFICATION_EMAIL=felipetiburcioviana@gmail.com
SUPER_ADMIN_BOOTSTRAP_SECRET=
ANTHROPIC_API_KEY=
AI_MODEL=claude-opus-4-8
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_BUSINESS=
CRON_SECRET=
STORAGE_DRIVER=local
UPLOAD_DIR=uploads
S3_BUCKET=
S3_REGION=auto
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
CLOUDINARY_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_FOLDER=
```

### Production rules

The environment schema enforces a few production checks:

- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be at least 32 characters and not placeholder values
- `JWT_REFRESH_SECRET` must differ from `JWT_SECRET`
- `STORAGE_DRIVER=s3` requires `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`
- `STORAGE_DRIVER=cloudinary` requires either `CLOUDINARY_URL` or all three discrete Cloudinary credentials
- `SUPER_ADMIN_BOOTSTRAP_SECRET`, when provided, must be strong in production

## Database setup and migrations

Generate the Prisma client and apply migrations:

```bash
cd inventory_system_api
npm run generate
npm run migrate
```

`npm run migrate` runs `npx prisma migrate dev --name init`.

For production or CI-style deployment:

```bash
npm run migrate:deploy
```

The project also includes Prisma seed scripts:

```bash
npm run seed
npm run seed:demo
npm run studio
```

## Running the API locally

### Standard local run

```bash
cd inventory_system_api
npm run dev
```

This starts the server with `ts-node-dev` and listens on `http://localhost:3000` by default.

### Production-like run

```bash
cd inventory_system_api
npm run build
npm start
```

`npm start` runs the compiled server at `dist/src/server.js`.

### Docker Compose

From `inventory_system_api/`:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on port `5432`
- the API on port `3000`
- a startup command that runs migrations, then tries to run the demo seed, then starts the compiled server

## Health and operational endpoints

The API exposes these base endpoints:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/openapi.json
```

The root endpoint returns a simple string:

```bash
curl http://localhost:3000/
```

## Demo and test accounts

The seeded demo company is designed to be safe and isolated from real tenant data.

Run:

```bash
cd inventory_system_api
npm run seed:demo
```

The script creates a company named `Stockvio Demo Co.` with a PRO plan and three demo users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `demo@stockvio.app` | `StockvioDemo!2026` |
| Warehouse | `warehouse@stockvio.app` | `StockvioDemo!2026` |
| Technician | `tech@stockvio.app` | `StockvioDemo!2026` |

The script is idempotent and safe to re-run. You can override values via environment variables such as:

- `SEED_DEMO_COMPANY_NAME`
- `SEED_DEMO_ADMIN_EMAIL`
- `SEED_DEMO_WAREHOUSE_EMAIL`
- `SEED_DEMO_TECHNICIAN_EMAIL`
- `SEED_DEMO_PASSWORD`

## API usage

The `openapi.json` file at `inventory_system_api/openapi.json` is the generated API schema for the project. It includes the main routes and auth expectations.

### Example auth flow

#### Register a company with an activation code

```bash
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "Secret123",
    "code": "TEST-2026",
    "companyName": "Acme HVAC"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin@example.com",
    "password": "Secret123"
  }'
```

The response returns access and refresh tokens. Use the bearer token in the `Authorization` header on protected routes:

```bash
curl http://localhost:3000/products \
  -H 'Authorization: Bearer <access_token>'
```

### Public lead endpoint

```bash
curl -X POST http://localhost:3000/leads \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "company": "Acme HVAC",
    "message": "Interested in a demo"
  }'
```

### Super-admin bootstrap

A first super-admin can be created via `POST /super-admin/create` when a valid `x-bootstrap-secret` header matches `SUPER_ADMIN_BOOTSTRAP_SECRET`.

```bash
curl -X POST http://localhost:3000/super-admin/create \
  -H 'Content-Type: application/json' \
  -H 'x-bootstrap-secret: your-bootstrap-secret' \
  -d '{
    "email": "admin@inventory.local",
    "password": "ChangeMe!2026",
    "name": "Platform Admin"
  }'
```

When no bootstrap secret is provided, the endpoint is disabled in production and the initial super-admin is normally created via the seed script.

## Main route groups

| Prefix | Purpose |
| --- | --- |
| `/auth` | Login, register, refresh, logout, password reset, password change |
| `/products` | Inventory products, stock levels, scan-in and scan-out |
| `/assets` | Asset management |
| `/users` | User CRUD, permission assignment, invites |
| `/reports` | Inventory summary, asset summary, audit logs, movement history |
| `/exports` | CSV/XLSX/PDF exports and JSON company exports |
| `/super-admin` | Activation codes, company list, pricing overrides, quotes, analytics, reconciliation |
| `/truck-stock` | Truck stock templates, assignments, receipts, transfers, movements |
| `/leads` | Demo/request forms |
| `/ai` | AI assistant status and chat |
| `/billing` | Stripe billing status and checkout/portal actions |
| `/cron` | Shared-secret scheduled daily jobs |
| `/health` | Liveness check |
| `/ready` | Readiness check that queries the database |
| `/openapi.json` | Generated API schema |

## File storage configuration

The storage layer is built around a driver-based abstraction in the backend. The selected driver is controlled by `STORAGE_DRIVER`.

### `local`

- Default in `.env.example`
- Writes to `UPLOAD_DIR` relative to the working directory
- Served under `/uploads`
- Best for local development or persistent mounted volumes

### `s3`

Set:

```env
STORAGE_DRIVER=s3
S3_BUCKET=your-bucket
S3_REGION=auto
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.example.com
```

### `cloudinary`

Set either:

```env
STORAGE_DRIVER=cloudinary
CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud>
```

or:

```env
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_FOLDER=stockvio
```

## Frontend setup

The frontend lives in the `web/` folder and is a Next.js app for the public marketing site and dashboard.

### Run the web app

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

The web app expects `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SITE_URL` in `.env.local`.

Example:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_SALES_EMAIL=sales@stockvio.app
```

The web app scripts are:

```bash
npm run dev
npm run build
npm start
npm run lint
npm run typecheck
```

## Testing

The backend test suite runs with Jest and Supertest.

```bash
cd inventory_system_api
npm test
```

Coverage:

```bash
npm run test:coverage
```

Type check:

```bash
npm run typecheck
```

The CI workflow in `.github/workflows/ci.yml` runs:

- Prisma client generation
- Prisma migrations
- TypeScript checks
- Jest tests with coverage
- Production build for the API
- Next.js lint, type check, and build for the web app

## Deployment

### Docker / container deployment

The `inventory_system_api/Dockerfile` builds a Node 22 image, installs Prisma dependencies, runs the TypeScript build, and starts the compiled server. The container exposes port `3000`.

The app also includes `inventory_system_api/docker-compose.yml` for local development with PostgreSQL.

### Railway deployment

`inventory_system_api/railway.json` defines a deployment start command that:

1. waits for the database to become reachable
2. runs `npx prisma migrate deploy`
3. tries to run `node dist/prisma/seed-demo.js` (non-fatal)
4. starts the API server

Set the deployment environment variables in the platform dashboard rather than a committed `.env` file.

### Production checklist

1. Generate strong `JWT_SECRET` and `JWT_REFRESH_SECRET` values.
2. Set `DATABASE_URL` to your production PostgreSQL instance.
3. Set `CORS_ORIGINS` to the real frontend origin and `FRONTEND_URL` to the deployed web app.
4. Provide email settings (`SMTP_*` or `RESEND_API_KEY`).
5. Decide on file storage: `local`, `s3`, or `cloudinary`.
6. If using Stripe, populate the Stripe secret keys and plan price IDs.
7. Run `npm run migrate:deploy` on release.

## Security notes

- The API uses bearer-token JWT authentication; no cookie-based auth is used.
- Protected routes are guarded by auth middleware and subscription checks.
- `helmet` adds security headers, `express-rate-limit` restricts request volume, and Zod validates request payloads.
- The app logs structured entries and avoids exposing internal details in client-facing error responses.
- The `x-cron-secret` header protects the scheduled `/cron/daily` endpoint.

## Useful commands summary

```bash
cd inventory_system_api
npm install
cp .env.example .env
npm run generate
npm run migrate
npm run dev
npm run build
npm start
npm test
npm run test:coverage
npm run seed:demo
```

## Notes

- The repository is intentionally split into an API and a web app.
- The API has a generated OpenAPI schema at `inventory_system_api/openapi.json`.
- Most tenant data is scoped by `companyId`.
- The `web/` app is a separate Next.js project and is not part of the API runtime itself.
