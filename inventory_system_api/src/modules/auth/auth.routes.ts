/**
 * @file auth.routes.ts
 * @description Authentication API routes.
 * Defines all endpoints for user registration, login, token refresh, logout, and password reset.
 * Rate limiting applied to authentication endpoints to prevent abuse.
 */

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema, registerSchema } from './auth.validation';

/** Initialize Express router */
const router = Router();

/** Create controller instance */
const controller = new AuthController();

/**
 * POST /auth/register
 * Register new company and admin user
 * 
 * @body {Object} Register data
 * @body {string} email - Admin user email
 * @body {string} password - Admin user password (min 6 chars)
 * @body {string} code - Activation code
 * @body {string} companyName - Company name
 * 
 * @returns {Object} Access and refresh tokens
 */
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  controller.register
);

/**
 * POST /auth/login
 * Authenticate user and return tokens
 * 
 * @body {Object} Login credentials
 * @body {string} email - User email
 * @body {string} password - User password
 * 
 * @returns {Object} Access and refresh tokens
 */
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  controller.login
);

/**
 * POST /auth/refresh
 * Request new access token using refresh token
 * 
 * @body {Object} Token data
 * @body {string} refreshToken - Valid refresh token
 * 
 * @returns {Object} New access token
 */
router.post('/refresh', controller.refresh);

/**
 * POST /auth/logout
 * Invalidate refresh token and logout user
 * 
 * @body {Object} Token data
 * @body {string} refreshToken - Refresh token to invalidate
 * 
 * @returns {Object} Success message
 */
router.post('/logout', controller.logout);

/**
 * GET /auth/validate
 * Validate current authentication and return user profile
 * 
 * @header {string} Authorization - Bearer {accessToken}
 * 
 * @returns {Object} User profile with role and permissions
 * 
 * @note Requires authMiddleware
 */
router.get('/validate', authMiddleware, controller.validate);

/**
 * POST /auth/request-reset
 * Request password reset link to be sent via email
 * 
 * @body {Object} Email data
 * @body {string} email - User email address
 * 
 * @returns {Object} Generic success message (for security)
 */
router.post(
  '/request-reset',
  authRateLimiter,
  controller.requestPasswordReset
);

/**
 * POST /auth/reset-password
 * Reset password using reset token from email
 * 
 * @body {Object} Reset data
 * @body {string} token - Password reset token from email
 * @body {string} newPassword - New password (min 6 chars)
 * 
 * @returns {Object} Success message
 */
router.post(
  '/reset-password',
  authRateLimiter,
  controller.resetPassword
);

export default router;