/**
 * @file rate-limit.middleware.ts
 * @description Rate limiting middleware configurations.
 * Implements request rate limiting to prevent abuse and DDoS attacks.
 * Two different rate limiters: general API limiter and stricter auth limiter.
 */

import rateLimit from 'express-rate-limit';

/**
 * General rate limiter for all API endpoints
 * Limits: 300 requests per 15 minutes per IP address
 * 
 * @type {RequestHandler}
 * @description Protects the entire API from excessive requests
 */
export const generalRateLimiter = rateLimit({
  /** Time window in milliseconds (15 minutes) */
  windowMs: 15 * 60 * 1000,
  /** Max requests allowed per window */
  limit: 300,
  /** Include rate limit headers in response */
  standardHeaders: true,
  /** Don't send legacy rate limit headers */
  legacyHeaders: false,
  /** Custom error message for rate limit exceeded */
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 10 requests per 15 minutes per IP address
 * 
 * @type {RequestHandler}
 * @description Prevents brute force attacks on login/register endpoints
 */
export const authRateLimiter = rateLimit({
  /** Time window in milliseconds (15 minutes) */
  windowMs: 15 * 60 * 1000,
  /** Max authentication attempts per window */
  limit: 10,
  /** Include rate limit headers in response */
  standardHeaders: true,
  /** Don't send legacy rate limit headers */
  legacyHeaders: false,
  /** Custom error message for auth rate limit exceeded */
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.'
  }
});