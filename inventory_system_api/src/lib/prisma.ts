/**
 * @file prisma.ts
 * @description Prisma database client singleton.
 * Initializes PostgreSQL adapter and exports a single Prisma client instance
 * used throughout the application for all database operations.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/** PostgreSQL database connection string from environment */
const connectionString = `${process.env.DATABASE_URL}`;

/** Initialize PostgreSQL adapter for Prisma */
const adapter = new PrismaPg({ connectionString });

/** Create single Prisma client instance to be used application-wide */
const prisma = new PrismaClient({ adapter });

/** Export Prisma client for database operations */
export { prisma };