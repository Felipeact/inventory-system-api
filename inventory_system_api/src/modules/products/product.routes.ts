import { Router } from 'express';
import { ProductController } from './product.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';
import { validate } from '../../middleware/validate.middleware';
import { createProductSchema, productIdSchema, scanProductSchema, updateProductSchema } from './product.validation';

const router = Router();
const controller = new ProductController();

router.post(
  '/',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.ADD_PRODUCT),
  validate(createProductSchema),
  controller.create
);

router.get(
  '/',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_STOCK),
  controller.getAll
);

router.get(
  '/low-stock',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_STOCK),
  controller.getLowStock
);

router.post(
  '/scan-in',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.SCAN_IN),
  validate(scanProductSchema),
  controller.scanIn
);

router.post(
  '/scan-out',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.SCAN_OUT),
  validate(scanProductSchema),
  controller.scanOut
);

router.get(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_STOCK),
  validate(productIdSchema),
  controller.getById
);

router.put(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.ADD_PRODUCT),
  validate(updateProductSchema),
  controller.update
);

router.delete(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.ADD_PRODUCT),
  validate(productIdSchema),
  controller.delete
);



export default router;