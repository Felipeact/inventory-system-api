/**
 * @file jwt.ts
 * @description JWT token generation utilities.
 * Provides functions to create access tokens, refresh tokens, and super admin tokens
 * with appropriate expiration times and secrets.
 */

import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Generate a short-lived JWT access token for authenticated users
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.companyId - Company ID
 * @returns {string} Signed JWT access token (expires in 15 minutes)
 */
export const generateAccessToken = (payload: {
  userId: string;
  companyId: string;
}) => {
  return jwt.sign(
    payload,
    env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
};

/**
 * Generate a long-lived JWT refresh token
 * Allows users to obtain new access tokens without re-authenticating
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.companyId - Company ID
 * @returns {string} Signed JWT refresh token (expires in 7 days)
 */
export const generateRefreshToken = (payload: {
  userId: string;
  companyId: string;
}) => {
  return jwt.sign(
    payload,
    env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
};

/**
 * Generate a JWT token for super admin authentication
 * Shorter expiration than user tokens (12 hours) for security
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.superAdminId - Super admin ID
 * @param {string} payload.email - Super admin email
 * @returns {string} Signed JWT super admin token (expires in 12 hours)
 */
export const generateSuperAdminToken = (payload: {
  superAdminId: string;
  email: string;
}) => {
  return jwt.sign(
    payload,
    env.JWT_SECRET!,
    { expiresIn: '12h' }
  );
};