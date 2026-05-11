/**
 * @file super-admin.middleware.ts
 * @description Super admin authentication middleware.
 * Validates JWT tokens for super admin endpoints.
 * Uses separate token validation from regular user auth.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../core/app-error';

/**
 * Extended Express Request interface for super admin context
 * 
 * @interface SuperAdminRequest
 * @extends Request
 * @property {Object} [superAdmin] - Super admin information
 * @property {string} superAdmin.superAdminId - Super admin's unique identifier
 * @property {string} superAdmin.email - Super admin's email address
 */
export interface SuperAdminRequest extends Request {
  superAdmin?: {
    superAdminId: string;
    email: string;
  };
}

/**
 * Super admin authentication middleware
 * Validates super admin JWT and loads super admin context
 * 
 * @param {SuperAdminRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @throws {AppError} 401 - If no Bearer token provided
 * @throws {AppError} 401 - If token is invalid or expired
 * 
 * @description
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies token signature using JWT_SECRET
 * 3. Attaches super admin info to req.superAdmin
 * 4. Only allows access to super admin-specific endpoints
 * 
 * @example
 * router.get('/super-admin/stats',
 *   superAdminMiddleware,
 *   controller.getStats
 * );
 */
export const superAdminMiddleware = (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) => {
  // Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  // Extract token from "Bearer <token>" format
  const token = authHeader.split(' ')[1];

  try {
    // Verify token and extract super admin info
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as {
      superAdminId: string;
      email: string;
    };

    // Attach super admin info to request
    req.superAdmin = decoded;

    next();
  } catch {
    return next(new AppError('Invalid token', 401));
  }
};