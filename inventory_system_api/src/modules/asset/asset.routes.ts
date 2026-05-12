import { Router } from 'express';
import { AssetController } from './asset.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';
import { validate } from '../../middleware/validate.middleware';
import { createAssetSchema, updateAssetSchema, assetIdSchema } from './asset.validation';

const router = Router();
const controller = new AssetController();

router.post(
  '/',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.ADD_ASSET),
  validate(createAssetSchema),
  controller.create
);

router.get(
  '/',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_ASSET),
  controller.getAll
);

router.get(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_ASSET),
  validate(assetIdSchema),
  controller.getById
);

router.put(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.EDIT_ASSET),
  validate(updateAssetSchema),
  controller.update
);

router.delete(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.DELETE_ASSET),
  validate(assetIdSchema),
  controller.delete
);

export default router;
