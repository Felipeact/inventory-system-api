import { Router } from 'express';
import { ProductController } from './product.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new ProductController();

router.post(
  '/',
  authMiddleware,
  requirePermission(PERMISSIONS.ADD_PRODUCT),
  controller.create
);

router.post(
  '/scan-in',
  authMiddleware,
  requirePermission('SCAN_IN'),
  controller.scanIn
);

router.post(
  '/scan-out',
  authMiddleware,
  requirePermission('SCAN_OUT'),
  controller.scanOut
);

router.get(
  '/',
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_STOCK),
  controller.getAll
);

router.put(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.ADD_PRODUCT),
  controller.update
);

router.delete(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.ADD_PRODUCT),
  controller.delete
);



export default router;