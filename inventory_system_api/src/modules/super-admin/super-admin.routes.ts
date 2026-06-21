import { Router } from 'express';
import { SuperAdminController } from './super-admin.controller';
import { superAdminMiddleware } from '../../middleware/super-admin.middleware';
import { validate } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { companyIdSchema, createActivationCodeSchema, createQuoteSchema, createSuperAdminSchema, setCompanyPricingSchema, superAdminLoginSchema, updateCompanyPlanSchema } from './super-admin.validation';

const router = Router();
const controller = new SuperAdminController();

router.post(
  '/create',
  authRateLimiter,
  validate(createSuperAdminSchema),
  controller.createSuperAdmin
);

router.post(
  '/login',
  authRateLimiter,
  validate(superAdminLoginSchema),
  controller.login
);

router.post(
  '/activation-codes',
  superAdminMiddleware,
  validate(createActivationCodeSchema),
  controller.createActivationCode
);

router.get(
  '/companies',
  superAdminMiddleware,
  controller.listCompanies
);

router.get(
  '/analytics',
  superAdminMiddleware,
  controller.getAnalytics
);

router.patch(
  '/companies/:id/pricing',
  superAdminMiddleware,
  validate(setCompanyPricingSchema),
  controller.setCompanyPricing
);

// Custom recurring charges ("quotes") billed monthly/biweekly via Stripe.
router.post(
  '/companies/:id/quote',
  superAdminMiddleware,
  validate(createQuoteSchema),
  controller.createQuote
);

router.get(
  '/companies/:id/quotes',
  superAdminMiddleware,
  validate(companyIdSchema),
  controller.listQuotes
);

router.post(
  '/quotes/:subId/cancel',
  superAdminMiddleware,
  controller.cancelQuote
);

router.patch(
  '/companies/:id/deactivate',
  superAdminMiddleware,
  validate(companyIdSchema),
  controller.deactivateCompany
);

router.patch(
  '/companies/:id/activate',
  superAdminMiddleware,
  validate(companyIdSchema),
  controller.activateCompany
);

router.patch(
  '/companies/:id/plan',
  superAdminMiddleware,
  validate(updateCompanyPlanSchema),
  controller.updateCompanyPlan
);

router.get(
  '/activation-codes',
  superAdminMiddleware,
  controller.listActivationCodes
);

router.patch(
  '/activation-codes/:id/deactivate',
  superAdminMiddleware,
  controller.deactivateActivationCode
);

export default router;