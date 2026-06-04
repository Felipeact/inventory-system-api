/**
 * @file app.ts
 * @description Main application entry point that configures Express server with all routes and middleware.
 * Sets up CORS, rate limiting, security headers, and routes for authentication, products, assets, users,
 * reports, exports, and super-admin functionality.
 */

import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import productRoutes from './modules/products/product.routes';
import dotenv from 'dotenv';
import userRoutes from './modules/user/user.routes';
import assetRoutes from './modules/asset/asset.routes';
import reportRoutes from './modules/report/report.routes';

import { errorMiddleware } from './middleware/error.middleware';
import { generalRateLimiter } from './middleware/rate-limit.middleware';
import superAdminRoutes from './modules/super-admin/super-admin.routes';
import helmet from 'helmet';
import { env } from './config/env';
import exportRoutes from './modules/export/export.routes';
import truckStockRoutes from './modules/truck-stock/truck-stock.routes';

dotenv.config();

/** Initialize Express application instance */
const app = express();

app.set('trust proxy', 1); // Enable if behind a proxy (e.g., for rate limiting to work correctly)

/** Security middleware - sets HTTP headers to help protect the app from various attacks */
app.use(helmet());

/** CORS middleware - allows requests from specified origins with credentials support */
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

/** Body parser middleware - parses incoming JSON requests with 1MB size limit */
app.use(express.json({ limit: '1mb' }));

/** Rate limiting middleware - restricts requests to prevent abuse (300 requests per 15 minutes) */
app.use(generalRateLimiter);

/** Health check endpoint - returns API status */
app.get('/', (req, res) => { 
  res.send('Inventory System API'); 
});

app.get('/updates/latest', (req, res) => {
  res.json({
    version: env.APP_VERSION,
    url: env.FRONTEND_URL,
    releaseDate: new Date().toISOString(),
    message: 'Latest update metadata'
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

/** Start the server on configured port */
app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});