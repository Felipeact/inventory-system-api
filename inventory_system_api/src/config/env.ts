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

  /** SMTP server hostname for email delivery */
  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  
  /** SMTP server port (defaults to 587) */
  SMTP_PORT: z.string().default('587'),
  
  /** SMTP authentication username */
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  
  /** SMTP authentication password */
  SMTP_PASS: z.string().min(1, 'SMTP_PASS is required'),
  
  /** Email sender address */
  SMTP_FROM: z.string().min(1, 'SMTP_FROM is required'),
  
  /** Frontend application URL for creating links in emails */
  FRONTEND_URL: z.string().min(1, 'FRONTEND_URL is required'),

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
  DB_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(10000)
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