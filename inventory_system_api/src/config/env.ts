/**
 * @file env.ts
 * @description Environment variable validation and configuration.
 * Uses Zod schema validation to ensure all required environment variables are present
 * with correct types. Application fails to start if validation fails.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

/** Load environment variables from .env file */
dotenv.config();

/**
 * Zod schema for validating environment variables
 * Defines all required configuration for the application including:
 * - Database connection (DATABASE_URL)
 * - JWT secrets for authentication
 * - Server port
 * - SMTP configuration for email sending
 * - Frontend URL for links in emails
 */
const envSchema = z.object({
  /** PostgreSQL database connection string */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  /** Secret key for signing JWT access tokens */
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  
  /** Secret key for signing JWT refresh tokens */
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  
  /** Server port (defaults to 3000) */
  PORT: z.string().default('3000'),

  /**
   * SMTP settings for transactional email (password reset, invites, welcome).
   * Optional: if any are unset, email delivery is disabled and the related flows
   * become no-ops instead of crashing. Set all four to enable email.
   */
  SMTP_HOST: z.string().default(''),

  /** SMTP server port (defaults to 587) */
  SMTP_PORT: z.string().default('587'),

  /** SMTP authentication username */
  SMTP_USER: z.string().default(''),

  /** SMTP authentication password */
  SMTP_PASS: z.string().default(''),

  /** Email sender address */
  SMTP_FROM: z.string().default(''),

  /**
   * Resend API key (https://resend.com). When set, email is sent over Resend's
   * HTTPS API instead of SMTP — useful on hosts that block outbound SMTP ports
   * (e.g. Railway). Takes precedence over SMTP when present.
   */
  RESEND_API_KEY: z.string().default(''),

  /** From address for Resend. Defaults to Resend's shared onboarding sender. */
  RESEND_FROM: z.string().default('onboarding@resend.dev'),

  /**
   * Address that receives operational/admin notifications (new company registrations,
   * super-admin creation, demo/lead submissions). Defaults to the platform owner so
   * notifications work out of the box once email is configured. Override per deployment.
   */
  ADMIN_NOTIFICATION_EMAIL: z.string().default('felipetiburcioviana@gmail.com'),

  /** Frontend application URL for creating links in emails (optional until a frontend exists) */
  FRONTEND_URL: z.string().default(''),

  /**
   * One-time bootstrap secret required to create the first super-admin via
   * `POST /super-admin/create`. Without a matching `x-bootstrap-secret` header the
   * endpoint is closed, preventing an attacker from seizing the platform before the
   * legitimate operator provisions the first account. REQUIRED in production.
   */
  SUPER_ADMIN_BOOTSTRAP_SECRET: z.string().default(''),

  /**
   * Anthropic (Claude) API key powering the in-app AI assistant. When unset the
   * AI endpoints return a friendly 503 instead of crashing, so the rest of the
   * API runs fine without it. Get one at https://console.anthropic.com.
   */
  ANTHROPIC_API_KEY: z.string().default(''),

  /** Claude model the AI assistant uses. Defaults to the latest Opus. */
  AI_MODEL: z.string().default('claude-opus-4-8'),

  /**
   * Stripe billing (optional). When STRIPE_SECRET_KEY is unset the /billing endpoints
   * return a friendly 503 and the rest of the API runs normally. Use a test key
   * (sk_test_…) while developing. STRIPE_WEBHOOK_SECRET (whsec_…) verifies incoming
   * webhook signatures. STRIPE_PRICE_STARTER/PRO/BUSINESS are the recurring FLAT
   * monthly Price IDs created in the Stripe dashboard for each plan (billed quantity 1).
   */
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_STARTER: z.string().default(''),
  STRIPE_PRICE_PRO: z.string().default(''),
  STRIPE_PRICE_BUSINESS: z.string().default(''),

  /**
   * Shared secret for the scheduled-jobs endpoint (POST /cron/daily). A scheduler
   * (Railway cron / GitHub Action) sends it as the `x-cron-secret` header to run the
   * daily reconcile + revenue snapshot. Leave blank to disable the endpoint.
   */
  CRON_SECRET: z.string().default(''),

  /** Application version for update endpoints */
  APP_VERSION: z.string().default('1.0.0'),

  /** Installer/download URL for desktop auto-update */
  UPDATE_DOWNLOAD_URL: z.string().default(''),

  /** Node environment */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /** Log level for the structured logger */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  /**
   * Comma-separated list of allowed CORS origins.
   * Defaults to local dev origins. In production, set this to your real frontend domains.
   */
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5173'),

  /** Max number of clients in the PostgreSQL connection pool */
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  /** Milliseconds a client may sit idle in the pool before being closed */
  DB_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30000),

  /** Milliseconds to wait for a connection from the pool before timing out */
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(10000),

  /**
   * Storage backend for uploaded receipt files.
   * - `local`: write to the local filesystem (dev, or a mounted persistent volume).
   * - `s3`:    write to an S3-compatible bucket (AWS S3, Cloudflare R2, MinIO).
   * - `cloudinary`: upload to Cloudinary (managed image/file CDN).
   */
  STORAGE_DRIVER: z.enum(['local', 's3', 'cloudinary']).default('local'),

  /** Directory (relative to cwd) for the local storage driver */
  UPLOAD_DIR: z.string().default('uploads'),

  /** S3 bucket name (required when STORAGE_DRIVER=s3) */
  S3_BUCKET: z.string().default(''),

  /** S3 region (use 'auto' for Cloudflare R2) */
  S3_REGION: z.string().default('auto'),

  /** Custom S3 endpoint, e.g. https://<account>.r2.cloudflarestorage.com (blank for AWS S3) */
  S3_ENDPOINT: z.string().default(''),

  /** S3 access key id (required when STORAGE_DRIVER=s3) */
  S3_ACCESS_KEY_ID: z.string().default(''),

  /** S3 secret access key (required when STORAGE_DRIVER=s3) */
  S3_SECRET_ACCESS_KEY: z.string().default(''),

  /** Public base URL files are served from, e.g. https://cdn.example.com (no trailing slash) */
  S3_PUBLIC_BASE_URL: z.string().default(''),

  /**
   * Cloudinary credentials (required when STORAGE_DRIVER=cloudinary). You can either
   * set the single CLOUDINARY_URL connection string (cloudinary://<key>:<secret>@<cloud>)
   * — which the SDK reads automatically — or the three discrete values below.
   */
  CLOUDINARY_URL: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  /** Optional folder prefix for uploaded assets, e.g. "vantori". Blank = no prefix. */
  CLOUDINARY_FOLDER: z.string().default('')
})
  .superRefine((val, ctx) => {
    // When using S3 storage, credentials and a bucket are mandatory.
    if (val.STORAGE_DRIVER === 's3') {
      for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!val[key]) {
          ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required when STORAGE_DRIVER=s3` });
        }
      }
    }

    // When using Cloudinary, require either CLOUDINARY_URL or the three discrete creds.
    if (val.STORAGE_DRIVER === 'cloudinary') {
      const hasUrl = Boolean(val.CLOUDINARY_URL);
      const hasDiscrete =
        Boolean(val.CLOUDINARY_CLOUD_NAME) &&
        Boolean(val.CLOUDINARY_API_KEY) &&
        Boolean(val.CLOUDINARY_API_SECRET);
      if (!hasUrl && !hasDiscrete) {
        ctx.addIssue({
          code: 'custom',
          path: ['CLOUDINARY_URL'],
          message:
            'When STORAGE_DRIVER=cloudinary, set CLOUDINARY_URL, or all of ' +
            'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET'
        });
      }
    }

    // In production, refuse to boot with weak or placeholder JWT secrets.
    if (val.NODE_ENV === 'production') {
      const isWeak = (secret: string) =>
        secret.length < 32 || /change.?me|your-super-secret|secret-key|placeholder/i.test(secret);

      for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
        if (isWeak(val[key])) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} must be a strong, non-placeholder value (32+ chars) in production. Generate one with: openssl rand -hex 32`
          });
        }
      }

      if (val.JWT_SECRET === val.JWT_REFRESH_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must differ from JWT_SECRET in production'
        });
      }

      // The bootstrap secret is OPTIONAL. It only gates the public
      // POST /super-admin/create endpoint. When it is set in production it must be
      // strong (16+ chars). When it is absent, that HTTP endpoint is disabled (see
      // super-admin.service.ts) and the first super-admin is created via `npm run
      // seed`, which writes to the database directly. The API must never fail to
      // boot just because this secret is missing.
      if (val.SUPER_ADMIN_BOOTSTRAP_SECRET && val.SUPER_ADMIN_BOOTSTRAP_SECRET.length < 16) {
        ctx.addIssue({
          code: 'custom',
          path: ['SUPER_ADMIN_BOOTSTRAP_SECRET'],
          message: 'SUPER_ADMIN_BOOTSTRAP_SECRET, when set, must be a strong value (16+ chars) in production. Generate one with: openssl rand -hex 32'
        });
      }
    }
  });

/** Validate environment variables against schema */
const parsed = envSchema.safeParse(process.env);

/** Exit application if validation fails */
if (!parsed.success) {
  console.error('Invalid environment variables');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

/** Exported validated environment variables */
export const env = parsed.data;

/** Parsed list of allowed CORS origins, trimmed of whitespace and empty entries */
export const corsOrigins = env.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

/**
 * Whether transactional email is configured. When false, email-dependent flows
 * (password reset, invites, welcome) are skipped instead of failing.
 */
export const emailEnabled = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM
);

/** Whether the Resend HTTPS email provider is configured (preferred over SMTP). */
export const resendEnabled = Boolean(env.RESEND_API_KEY);

/**
 * Whether the AI assistant is configured. When false the `/ai` endpoints return a
 * 503 with guidance instead of attempting to reach Anthropic without a key.
 */
export const aiEnabled = Boolean(env.ANTHROPIC_API_KEY);

/**
 * Whether Stripe billing is configured. When false the `/billing` endpoints return a
 * 503 with guidance instead of attempting to reach Stripe without a key.
 */
export const billingEnabled = Boolean(env.STRIPE_SECRET_KEY);