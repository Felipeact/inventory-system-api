import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from './auth.middleware';
import { AppError } from '../core/app-error';

export const subscriptionMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const companyId = req.user?.companyId;

  if (!companyId) {
    return next(new AppError('Company not found in token', 401));
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId }
  });

  if (!company) {
    return next(new AppError('Company not found', 404));
  }

  if (company.subscriptionStatus !== 'ACTIVE') {
    return next(new AppError('Subscription is not active', 403));
  }

  next();
};