/**
 * @file server.ts
 * @description HTTP server entry point. Imports the configured Express app and binds
 * it to a port. Kept separate from app.ts so the app can be imported by tests without
 * starting a listener. Handles graceful shutdown of the server and database pool.
 */

import { env } from './config/env';
import app from './app';
import { logger } from './lib/logger';
import { disconnectPrisma } from './lib/prisma';

const server = app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
});

/** Gracefully close the HTTP server and database connections on termination signals */
async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(async () => {
    try {
      await disconnectPrisma();
      logger.info('Closed remaining connections');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  });

  // Force exit if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Could not close connections in time, forcing exit');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

/**
 * An uncaught exception leaves the process in an undefined state. Log it and exit so the
 * orchestrator (Docker/Railway) restarts a clean instance rather than serving from a
 * potentially corrupted runtime.
 */
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception, shutting down');
  void shutdown('uncaughtException');
});
