import { Router } from 'express';
import { AssetController } from './asset.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';
import { validate } from '../../middleware/validate.middleware';
import { createAssetSchema, updateAssetSchema, assetIdSchema } from './asset.validation';

const router = Router();
const controller = new AssetController();

router.post(
  '/',
  authMiddleware,
  requirePermission(PERMISSIONS.ADD_ASSET),
  validate(createAssetSchema),
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
  validate(assetIdSchema),
  controller.getById
);

router.put(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.EDIT_ASSET),
  validate(updateAssetSchema),
  controller.update
);

router.delete(
  '/:id',
  authMiddleware,
  requirePermission(PERMISSIONS.DELETE_ASSET),
  validate(assetIdSchema),
  controller.delete
);

export default router;
