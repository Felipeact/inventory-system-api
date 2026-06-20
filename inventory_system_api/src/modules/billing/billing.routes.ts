/**
 * @file billing.routes.ts
 * @description Authenticated billing routes. Note these intentionally do NOT use the
 * subscription middleware — a company with an inactive/expired subscription must still be
 * able to reach checkout and the customer portal to pay. The Stripe webhook receiver is
 * mounted separately in app.ts (it needs the raw request body).
 */

import { Router } from 'express';
import { BillingController } from './billing.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();
const controller = new BillingController();

/** Any authenticated user may view the company's current plan/billing status. */
router.get('/status', authMiddleware, controller.status);

/** Only admins (MANAGE_USERS) may start checkout or open the billing portal. */
router.post('/checkout', authMiddleware, requirePermission(PERMISSIONS.MANAGE_USERS), controller.checkout);
router.post('/portal', authMiddleware, requirePermission(PERMISSIONS.MANAGE_USERS), controller.portal);

export default router;
