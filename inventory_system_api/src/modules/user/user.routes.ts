import { Router } from 'express';
import { UserController } from './user.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';
import { validate } from '../../middleware/validate.middleware';
import { createUserSchema, assignPermissionSchema, removePermissionSchema, userIdSchema, updateCurrentUserProfileSchema, inviteUserSchema } from './user.validation';

const router = Router();
const controller = new UserController();

router.use(authMiddleware);
router.use(subscriptionMiddleware);

router.post(
  '/',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validate(createUserSchema),
  controller.create
);

router.post(
  '/assign-permission',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validate(assignPermissionSchema),
  controller.assignPermission
);

router.post(
  '/remove-permission',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validate(removePermissionSchema),
  controller.removePermission
);

router.get(
  '/',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  controller.getAll
);

router.patch(
  '/me',
  validate(updateCurrentUserProfileSchema),
  controller.updateCurrentProfile
);

router.post(
  '/invite',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validate(inviteUserSchema),
  controller.invite
);

router.put(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validate(userIdSchema),
  controller.update
);

router.post(
  '/:id/reset-password',
  requirePermission(
    PERMISSIONS.MANAGE_USERS
  ),
  validate(userIdSchema),
  controller.resetPassword
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_USERS),
  validate(userIdSchema),
  controller.delete
);

export default router;