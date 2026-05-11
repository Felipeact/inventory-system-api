/**
 * @file auth.middleware.ts
 * @description Authentication middleware for verifying JWT tokens and loading user context.
 * Validates Bearer tokens, retrieves user data with roles and permissions,
 * and attaches user info to request object for downstream handlers.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { AppError } from '../core/app-error';

/**
 * Extended Express Request interface with authenticated user data
 * 
 * @interface AuthRequest
 * @extends Request
 * @property {Object} [user] - Authenticated user information
 * @property {string} user.userId - User's unique identifier
 * @property {string} user.companyId - User's company identifier
 * @property {string} user.role - User's role name
 * @property {string[]} user.permissions - Array of permission names
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    companyId: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Authentication middleware - validates JWT and loads user context
 * 
 * @async
 * @param {AuthRequest} req - Express request with optional user property
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @throws {AppError} 401 - If no token provided or token is invalid
 * @throws {AppError} 401 - If user not found in database
 * 
 * @description
 * 1. Extracts Bearer token from Authorization header
 * 2. Verifies JWT signature using JWT_SECRET
 * 3. Looks up user in database with role and permission data
 * 4. Combines role and individual user permissions
 * 5. Attaches user info to req.user for route handlers
 * 
 * @example
 * router.get('/protected', authMiddleware, handler);
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract token from "Bearer <token>" format
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new AppError('No token provided', 401);
    }

    // Verify token signature and extract payload
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      companyId: string;
    };

    // Retrieve user data with role and permission information
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid user', 401);
    }

    // Extract permission names from role permissions
    const rolePermissions = user.role.rolePermissions.map(
      (rolePermission) => rolePermission.permission.name
    );

    // Extract permission names from individual user permissions
    const extraPermissions = user.userPermissions.map(
      (userPermission) => userPermission.permission.name
    );

    // Combine and deduplicate permissions
    const permissions = Array.from(
      new Set([...rolePermissions, ...extraPermissions])
    );

    // Attach user information to request
    req.user = {
      userId: user.id,
      companyId: user.companyId,
      role: user.role.name,
      permissions,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Invalid token', 401));
    }
  }
};