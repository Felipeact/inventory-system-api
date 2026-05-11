/**
 * @file permission.middleware.ts
 * @description Permission/authorization middleware for role-based access control.
 * Checks if authenticated user has required permission before allowing access to routes.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Higher-order middleware factory that creates permission checkers
 * Returns middleware that validates user has specific permission
 * 
 * @param {string} permission - Required permission name (from PERMISSIONS constant)
 * @returns {Function} Express middleware that checks permission
 * 
 * @throws {AppError} 401 - If user not authenticated
 * @throws {AppError} 403 - If user lacks required permission
 * 
 * @example
 * // Usage in routes
 * router.patch('/assets/:id',
 *   authMiddleware,
 *   requirePermission(PERMISSIONS.EDIT_ASSET),
 *   controller.update
 * );
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has required permission
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // User has permission, proceed
    next();
  };
};