import { Router } from 'express';
import { AssetController } from './asset.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new AssetController();

router.post(
  '/',
  authMiddleware,
  requirePermission(PERMISSIONS.ADD_ASSET),
  controller.create
);

router.get(
  '/',
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_ASSET),
  controller.getAll
);

router.get(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.VIEW_ASSET),
  controller.getById
);

router.patch(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.EDIT_ASSET),
  controller.update
);

router.delete(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.DELETE_ASSET),
  controller.delete
);

export default router;
