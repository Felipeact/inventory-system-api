# Inventory System API

A multi-tenant inventory, asset, and truck-stock management REST API built with
**Express 5**, **TypeScript**, **Prisma**, and **PostgreSQL**. It provides JWT-based
authentication with role/permission-based access control (RBAC), audit logging,
PDF/Excel exports, transactional email, and a super-admin surface for managing
companies and activation codes.

> The application code lives in [`inventory_system_api/`](inventory_system_api/).

## Tech stack

| Concern          | Choice                                  |
| ---------------- | --------------------------------------- |
| Runtime          | Node.js 22                              |
| Language         | TypeScript                              |
| HTTP framework   | Express 5                               |
| ORM / DB         | Prisma + PostgreSQL (node-postgres pool)|
| Auth             | JWT access + refresh tokens (bearer)    |
| Validation       | Zod                                     |
| Logging          | Pino (structured JSON) + pino-http      |
| Email            | Nodemailer (SMTP)                       |
| Tests            | Jest + supertest                        |

## Getting started

```bash
cd inventory_system_api
cp .env.example .env          # then fill in real values
npm install
npm run generate              # generate the Prisma client
npm run migrate               # apply migrations to your dev database
npm run dev                   # start with hot reload (ts-node-dev)
```

The API listens on `http://localhost:3000` by default. Visit `/health` for a
liveness probe and `/openapi.json` for the API schema.

### With Docker

A multi-stage `Dockerfile` and a `docker-compose.yml` (API + PostgreSQL) are
provided:

```bash
cd inventory_system_api
docker compose up --build
```

Compose applies pending migrations (`prisma migrate deploy`) before starting the
compiled server. Override secrets via environment variables or an `.env` file.

## Scripts

| Script                  | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Start the server with hot reload                       |
| `npm run build`         | Generate the Prisma client and compile to `dist/`      |
| `npm start`             | Run the compiled server (`dist/src/server.js`)         |
| `npm run typecheck`     | Type-check without emitting                            |
| `npm test`              | Run the Jest test suite                                |
| `npm run test:coverage` | Run tests with a coverage report                       |
| `npm run migrate`       | Create/apply a dev migration                           |
| `npm run migrate:deploy`| Apply migrations in production (no prompts)            |
| `npm run seed`          | Bootstrap super-admin + sample activation code         |
| `npm run seed:demo`     | Provision the isolated demonstration/test company      |
| `npm run studio`        | Open Prisma Studio                                     |

## Demo / test account

`npm run seed:demo` provisions a **self-contained demonstration company** so the app
can be shown off or QA'd without touching real customer data. Because the platform is
multi-tenant and every record is scoped by `companyId`, everything it creates is fully
isolated — anything you do while logged into the demo account only ever affects the
demo company.

```bash
cd inventory_system_api
npm run seed:demo
```

It creates **"Stockvio Demo Co."** (PRO plan) with three logins covering every role, a
realistic field-service product catalogue (with a few intentionally low-stock items),
sample assets, and trucks with a stock template:

| Role       | Email                  | Password           |
| ---------- | ---------------------- | ------------------ |
| Admin      | `demo@stockvio.app`     | `StockvioDemo!2026` |
| Warehouse  | `warehouse@stockvio.app`| `StockvioDemo!2026` |
| Technician | `tech@stockvio.app`     | `StockvioDemo!2026` |

The script is **idempotent and resets the demo to a known-good state** on every run
(records are upserted by their natural keys, so re-running reverts any edits made while
demoing and never creates duplicates). Override the company name, emails, or password
via `SEED_DEMO_COMPANY_NAME`, `SEED_DEMO_ADMIN_EMAIL`, `SEED_DEMO_WAREHOUSE_EMAIL`,
`SEED_DEMO_TECHNICIAN_EMAIL`, and `SEED_DEMO_PASSWORD`.

### On production

The deploy start command (`railway.json`, and the `docker-compose.yml` for self-hosting)
runs the demo seed automatically after migrations, using the **compiled** script
(`node dist/prisma/seed-demo.js` — the production image has no `ts-node`). So the demo
company is present after every deploy and self-heals back to a clean state on each
restart. The step is **non-fatal**: if the seed ever fails it is logged and the API still
boots.

- **Keep it private:** set `SEED_DEMO_PASSWORD` (and optionally the email/company vars) in
  the Railway dashboard to override the documented default, so the live demo password
  isn't the one published here.
- **Turn it off:** remove the `node dist/prisma/seed-demo.js ...` segment from the start
  command. (The demo company is fully isolated by `companyId`, so it never affects real
  tenants either way.)

## Configuration

All environment variables are validated on startup by
[`src/config/env.ts`](inventory_system_api/src/config/env.ts); the process exits if
any required value is missing or malformed. See
[`.env.example`](inventory_system_api/.env.example) for the full list. Notable ones:

- `DATABASE_URL` — PostgreSQL connection string.
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — token signing secrets (use long random values).
- `CORS_ORIGINS` — comma-separated allowed frontend origins (**set this in production**).
- `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT_MS`, `DB_POOL_CONNECTION_TIMEOUT_MS` — pool tuning.
- `LOG_LEVEL` / `NODE_ENV` — logging verbosity and environment mode.
- `SMTP_*`, `FRONTEND_URL` — email delivery and link generation.
- `STORAGE_DRIVER` (`local`|`s3`|`cloudinary`) + `UPLOAD_DIR` / `S3_*` / `CLOUDINARY_*` — where uploaded receipts are stored.

## File storage

Uploaded receipt files go through a storage abstraction
([`src/lib/storage.ts`](inventory_system_api/src/lib/storage.ts)) with three drivers:

- **`local`** (default) — writes under `UPLOAD_DIR` and serves files at `/uploads`.
  Fine for development or a **mounted persistent volume**.
- **`s3`** — writes to an S3-compatible bucket (AWS S3, Cloudflare R2, MinIO). Files
  survive redeploys and work across multiple instances. **Use this on ephemeral
  container platforms** (Railway/Render/Fly), where the local filesystem is wiped on
  every deploy. Set `STORAGE_DRIVER=s3` plus `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
  `S3_SECRET_ACCESS_KEY` (and `S3_ENDPOINT`/`S3_REGION` for R2).
- **`cloudinary`** — uploads to [Cloudinary](https://cloudinary.com) and serves files
  from its CDN over HTTPS. Also survives redeploys and needs no volume. Set
  `STORAGE_DRIVER=cloudinary` plus either `CLOUDINARY_URL`
  (`cloudinary://<key>:<secret>@<cloud>`, copied from the dashboard) **or** the discrete
  `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`; optionally
  `CLOUDINARY_FOLDER` to prefix uploads. The app refuses to boot if the driver is set
  without credentials.

## Deployment checklist

1. **Generate strong secrets:** `openssl rand -hex 32` for `JWT_SECRET` and again for
   `JWT_REFRESH_SECRET` (must differ). With `NODE_ENV=production` the app **refuses to
   boot** with short or placeholder secrets.
2. **Set env vars in the platform dashboard** (not a committed `.env`): the secrets
   above, `DATABASE_URL`, `CORS_ORIGINS` (your real frontend origin), `NODE_ENV=production`,
   and `SMTP_*`.
3. **Choose storage:** `STORAGE_DRIVER=s3` with bucket credentials, `STORAGE_DRIVER=cloudinary`
   with Cloudinary credentials, or a mounted volume with `STORAGE_DRIVER=local`.
4. **Run migrations on release:** `npm run migrate:deploy`.

## API surface

Routes are mounted under these prefixes (see `src/app.ts`):

| Prefix         | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `/auth`        | Register, login, refresh, logout, password reset |
| `/products`    | Product catalog management                       |
| `/assets`      | Asset management                                 |
| `/users`       | User management (RBAC)                            |
| `/reports`     | Report generation                                |
| `/exports`     | PDF / Excel data exports                         |
| `/super-admin` | Company and activation-code administration       |
| `/truck-stock` | Truck stock templates, assignments, movements    |
| `/health`      | Liveness/readiness probe                         |
| `/openapi.json`| OpenAPI schema                                   |

## Testing

```bash
cd inventory_system_api
npm test
```

The suite includes unit tests (JWT, validation schemas, validation/error
middleware) and integration tests that exercise the Express app via supertest
(health, CORS, security headers). Continuous integration runs type-checking,
tests with coverage, and a production build on every push and PR — see
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Security notes

- **Authentication is stateless bearer-token (JWT).** Tokens travel in the
  `Authorization: Bearer <token>` header and refresh tokens in the request body —
  the API does **not** use cookie-based sessions.
- **CSRF:** Because the API does not rely on browser-managed credentials (cookies),
  it is not susceptible to classic CSRF; browsers do not automatically attach
  `Authorization` headers to cross-site requests. No CSRF token layer is required
  for the current bearer-token design. If cookie-based auth is ever introduced,
  add CSRF protection (e.g. the double-submit pattern) at that time.
- `helmet` sets hardening HTTP headers; `express-rate-limit` throttles general and
  auth endpoints; Zod validates all inputs; errors are logged with request context
  and never leak internal details to clients.
