import { Router } from 'express';
import { ReportController } from './report.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new ReportController();

router.get(
    '/inventory-summary',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_STOCK),
    controller.inventorySummary
);

router.get(
    '/assets-summary',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_STOCK),
    controller.assetsSummary
);

router.get(
    '/audit-logs',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.MANAGE_USERS),
    controller.auditLogs
);

router.get(
    '/stock-movements',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_STOCK),
    controller.stockMovements
);

export default router;