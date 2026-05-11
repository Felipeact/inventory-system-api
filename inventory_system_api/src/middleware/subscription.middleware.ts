/**
 * @file subscription.middleware.ts
 * @description Subscription validation middleware.
 * Ensures company subscription is active before allowing access to protected features.
 * Must be used after authMiddleware to have company context.
 */

import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../core/app-error';

/**
 * Subscription validation middleware
 * Checks if user's company has active subscription
 * 
 * @async
 * @param {AuthRequest} req - Request with authenticated user data
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @throws {AppError} 401 - If company not found in user token
 * @throws {AppError} 404 - If company doesn't exist in database
 * @throws {AppError} 403 - If subscription is not active
 * 
 * @description
 * 1. Extracts company ID from authenticated user
 * 2. Looks up company subscription status in database
 * 3. Blocks access if subscription is not ACTIVE
 * 4. Prevents inactive companies from using premium features
 * 
 * @example
 * router.get('/products',
 *   authMiddleware,
 *   subscriptionMiddleware,
 *   controller.getAll
 * );
 */
export const subscriptionMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Get company ID from authenticated user
  const companyId = req.user?.companyId;

  if (!companyId) {
    return next(new AppError('Company not found in token', 401));
  }

  // Look up company subscription status
  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    return next(new AppError('Company not found', 404));
  }

  // Ensure subscription is active
  if (company.subscriptionStatus !== 'ACTIVE') {
    return next(new AppError('Subscription is not active', 403));
  }

  next();
};