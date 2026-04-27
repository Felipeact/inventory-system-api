import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new UserController();

router.use(authMiddleware);

router.post(
  '/',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.create
);

router.post(
  '/assign-permission',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.assignPermission
);

router.post(
  '/remove-permission',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.removePermission
);

router.get(
  '/',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.getAll
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.delete
);

export default router;