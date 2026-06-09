import { Router } from 'express';
import { TruckStockController } from './truck-stock.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new TruckStockController();

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post(
  '/trucks',
  requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
  controller.createTruck
);

router.get(
  '/trucks',
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
  requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
  controller.createTemplate
);

router.get(
  '/templates',
  requirePermission(PERMISSIONS.VIEW_TRUCK_STOCK),
  controller.getTemplates
);

router.get(
  '/templates/:id',
  requirePermission(PERMISSIONS.VIEW_TRUCK_STOCK),
  controller.getTemplateById
);

router.put(
  '/templates/:id',
  requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
  controller.updateTemplate
);

router.delete(
  '/templates/:id',
  requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
  controller.deleteTemplate
);

router.post(
  '/assignments',
  requirePermission(PERMISSIONS.ASSIGN_TRUCK_STOCK),
  controller.assignTemplate
);

router.get(
  '/assignments',
  requirePermission(PERMISSIONS.MANAGE_TRUCK_STOCK),
  controller.getAssignments
);

router.put(
  '/assignments/:id',
  requirePermission(PERMISSIONS.ASSIGN_TRUCK_STOCK),
  controller.updateAssignment
);

router.delete(
  '/assignments/:id',
  requirePermission(PERMISSIONS.ASSIGN_TRUCK_STOCK),
  controller.deleteAssignment
);

router.get(
  '/my-stock',
  requirePermission(PERMISSIONS.VIEW_ASSIGNED_TRUCK_STOCK),
  controller.getMyTruckStock
);

router.get(
  '/low-stock',
  requirePermission(PERMISSIONS.VIEW_LOW_STOCK_ALERTS),
  controller.getLowStockItems
);

router.patch(
  '/items/:itemId/quantity',
  requirePermission(PERMISSIONS.TRANSFER_STOCK_TO_TRUCK),
  controller.updateItemQuantity
);

router.get(
  '/movements',
  requirePermission(PERMISSIONS.VIEW_TRUCK_STOCK),
  controller.getMovements
);

router.post(
  '/transfer-to-truck',
  requirePermission(PERMISSIONS.TRANSFER_STOCK_TO_TRUCK),
  controller.transferToTruck
);

router.post(
  '/use-item',
  requirePermission(PERMISSIONS.VIEW_ASSIGNED_TRUCK_STOCK),
  controller.useTruckItem
);

router.post(
  '/receipts',
  requirePermission(PERMISSIONS.UPLOAD_RECEIPT),
  controller.createReceipt
);

router.get(
  '/receipts',
  requirePermission(PERMISSIONS.APPROVE_RECEIPTS),
  controller.getReceipts
);

router.post(
  '/receipts/:receiptId/items',
  requirePermission(PERMISSIONS.UPLOAD_RECEIPT),
  controller.addReceiptItem
);

router.post(
  '/receipts/:receiptId/reconcile',
  requirePermission(PERMISSIONS.APPROVE_RECEIPTS),
  controller.reconcileReceipt
);

router.patch(
  '/receipts/:receiptId/status',
  requirePermission(PERMISSIONS.APPROVE_RECEIPTS),
  controller.updateReceiptStatus
);

export default router;