import { Router } from 'express';
import { SuperAdminController } from './super-admin.controller';
import { superAdminMiddleware } from '../../middleware/super-admin.middleware';
import { validate } from '../../middleware/validate.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { companyIdSchema, createActivationCodeSchema, createDealSchema, createQuoteSchema, createSuperAdminSchema, dealIdSchema, setCompanyPricingSchema, superAdminLoginSchema, updateCompanyPlanSchema } from './super-admin.validation';

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

// ── Sales pipeline: prospect quotes (deals) ──────────────────────────────────
// Create a quote for a prospect (company typed by hand), send a pay link, then
// statuses drive the pipeline. On payment the activation code is auto-issued.
router.get(
  '/deals',
  superAdminMiddleware,
  controller.listDeals
);

router.post(
  '/deals',
  superAdminMiddleware,
  validate(createDealSchema),
  controller.createDeal
);

router.post(
  '/deals/:id/send',
  superAdminMiddleware,
  validate(dealIdSchema),
  controller.sendDeal
);

router.post(
  '/deals/:id/email-code',
  superAdminMiddleware,
  validate(dealIdSchema),
  controller.emailDealCode
);

router.post(
  '/deals/:id/decline',
  superAdminMiddleware,
  validate(dealIdSchema),
  controller.declineDeal
);

router.delete(
  '/deals/:id',
  superAdminMiddleware,
  validate(dealIdSchema),
  controller.removeDeal
);

// Re-check a sent quote against Stripe (recover a missed webhook).
router.post(
  '/deals/:id/sync',
  superAdminMiddleware,
  validate(dealIdSchema),
  controller.syncDeal
);

// Force-issue the activation code now (payment confirmed out of band).
router.post(
  '/deals/:id/issue-code',
  superAdminMiddleware,
  validate(dealIdSchema),
  controller.forceIssueDealCode
);

// Reconcile every company subscription + open quote against Stripe.
router.post(
  '/reconcile',
  superAdminMiddleware,
  controller.reconcile
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