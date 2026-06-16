/**
 * @file prisma.ts
 * @description Prisma database client singleton.
 * Initializes a PostgreSQL connection pool (via node-postgres) and exports a single
 * Prisma client instance used throughout the application for all database operations.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";
import { logger } from "./logger";

/**
 * PostgreSQL connection pool.
 * Pool sizing and timeouts are configurable via environment variables so the API
 * can be tuned for production load (see DB_POOL_* in env.ts).
 */
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_POOL_CONNECTION_TIMEOUT_MS
});

/** Surface unexpected pool-level errors instead of crashing silently */
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error on idle PostgreSQL client");
});

/** Initialize Prisma's PostgreSQL adapter on top of the shared pool */
const adapter = new PrismaPg(pool);

/** Create single Prisma client instance to be used application-wide */
const prisma = new PrismaClient({ adapter });

/** Gracefully drain the pool and disconnect Prisma (used on shutdown) */
export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}

/** Export Prisma client for database operations */
export { prisma, pool };
