/**
 * @file app.ts
 * @description Express application factory. Configures CORS, rate limiting, security
 * headers, request logging, and routes for authentication, products, assets, users,
 * reports, exports, super-admin, and truck-stock functionality.
 *
 * The HTTP server is started separately in `server.ts` so that the configured app
 * can be imported by tests (e.g. supertest) without binding to a port.
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';
import userRoutes from './modules/user/user.routes';
import assetRoutes from './modules/asset/asset.routes';
import reportRoutes from './modules/report/report.routes';

import { errorMiddleware } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rate-limit.middleware';
import superAdminRoutes from './modules/super-admin/super-admin.routes';
import helmet from 'helmet';
import { env, corsOrigins } from './config/env';
import { logger } from './lib/logger';
import exportRoutes from './modules/export/export.routes';
import truckStockRoutes from './modules/truck-stock/truck-stock.routes';

/** Initialize Express application instance */
const app = express();

app.set('trust proxy', 1); // Enable if behind a proxy (e.g., for rate limiting to work correctly)

/**
 * Structured request logging with per-request child logger and request id.
 * Serializers keep the default per-request line concise (method, url, status,
 * response time). Set LOG_LEVEL=debug for the full request/response detail.
 */
app.use(pinoHttp({
  logger,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode })
  }
}));

/** Security middleware - sets HTTP headers to help protect the app from various attacks */
app.use(helmet());

/**
 * CORS middleware - allows requests from origins configured via the CORS_ORIGINS env var.
 * Requests with no origin (e.g. mobile apps, curl, same-origin) are allowed.
 */
app.use(cors({
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}));

/** Body parser middleware - parses incoming JSON requests with a size limit */
app.use(express.json({ limit: '15mb' }));

/** Public receipt/file upload storage */
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

/** Rate limiting middleware - restricts requests to prevent abuse (300 requests per 15 minutes) */
app.use(generalRateLimiter);

/** Health check endpoint - returns API status */
app.get('/', (req, res) => {
  res.send('Inventory System API');
});

/** Liveness/readiness probe for orchestrators (Docker, k8s, load balancers) */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/openapi.json', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'openapi.json'));
});

app.get('/updates/latest', (req, res) => {
  res.json({
    version: env.APP_VERSION || '1.0.0',
    downloadUrl: env.UPDATE_DOWNLOAD_URL || env.FRONTEND_URL,
    releaseNotes: 'Latest update available.',
    required: false,
    changeLog: 'Bug fixes and improvements.',
    releaseDate: new Date().toISOString()
  });
});

/** Route definitions for all API endpoints */
app.use('/auth', authRoutes); // Authentication routes (register, login, refresh, reset password)
app.use('/products', productRoutes); // Product management routes
app.use('/assets', assetRoutes); // Asset management routes
app.use('/users', userRoutes); // User management routes
app.use('/reports', reportRoutes); // Report generation routes
app.use('/exports', exportRoutes); // Data export routes
app.use('/super-admin', superAdminRoutes); // Super admin management routes
app.use('/truck-stock', truckStockRoutes);

/** Error handling middleware - must be last middleware */
app.use(errorMiddleware);

export default app;
