import { Router } from 'express';
import { ExportController } from './export.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new ExportController();

router.get(
  '/products/csv',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_STOCK),
  controller.productsCsv
);

router.get(
  '/assets/csv',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_STOCK),
  controller.assetsCsv
);

router.get(
  '/users/csv',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.usersCsv
);

router.get(
  '/company/json',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.companyJson
);

export default router;