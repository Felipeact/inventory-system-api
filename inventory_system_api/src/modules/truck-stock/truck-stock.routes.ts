import { Router } from 'express';
import { TruckStockController } from './truck-stock.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new TruckStockController();

router.post(
    '/trucks',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
    controller.createTruck
);

router.get(
    '/trucks',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_ALL_TRUCKS),
    controller.getTrucks
);

router.put(
    '/trucks/:id',
    requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
    controller.updateTruck
);

router.post(
    '/templates',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
    controller.createTemplate
);

router.get(
    '/templates',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_TRUCK_STOCK),
    controller.getTemplates
);

router.post(
    '/assignments',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.ASSIGN_TRUCK_STOCK),
    controller.assignTemplate
);

router.get(
    '/assignments',
    requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
    controller.getAssignments
);

router.get(
    '/my-stock',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_ASSIGNED_TRUCK_STOCK),
    controller.getMyTruckStock
);

router.get(
    '/low-stock',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_LOW_STOCK_ALERTS),
    controller.getLowStockItems
);

router.patch(
    '/items/:itemId/quantity',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.TRANSFER_STOCK_TO_TRUCK),
    controller.updateItemQuantity
);

router.get(
    '/movements',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_TRUCK_STOCK),
    controller.getMovements
);

router.post(
    '/transfer-to-truck',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.TRANSFER_STOCK_TO_TRUCK),
    controller.transferToTruck
);

router.post(
    '/use-item',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.VIEW_ASSIGNED_TRUCK_STOCK),
    controller.useTruckItem
);

router.post(
    '/receipts',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.UPLOAD_RECEIPT),
    controller.createReceipt
);

router.get(
    '/receipts',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.APPROVE_RECEIPTS),
    controller.getReceipts
);

router.post(
    '/receipts/:receiptId/items',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.UPLOAD_RECEIPT),
    controller.addReceiptItem
);

router.post(
    '/receipts/:receiptId/reconcile',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.APPROVE_RECEIPTS),
    controller.reconcileReceipt
);

router.patch(
    '/receipts/:receiptId/status',
    authMiddleware,
    subscriptionMiddleware,
    requirePermission(PERMISSIONS.APPROVE_RECEIPTS),
    controller.updateReceiptStatus
);

export default router;