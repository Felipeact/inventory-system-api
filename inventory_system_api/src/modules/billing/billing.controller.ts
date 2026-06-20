/**
 * @file billing.controller.ts
 * @description HTTP handlers for Stripe billing: checkout, customer portal, status, and
 * the Stripe webhook receiver. The webhook handler is exported separately because it must
 * run on the raw request body (mounted before the JSON body parser in app.ts).
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../core/async-handler';
import { AppError } from '../../core/app-error';
import { billingEnabled } from '../../config/env';
import { logger } from '../../lib/logger';
import { BillingService } from './billing.service';

const service = new BillingService();

export class BillingController {
  status = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new AppError('Unauthorized', 401);
    res.json(await service.getStatus(req.user.companyId));
  });

  checkout = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const { plan } = req.body ?? {};
    res.json(await service.createCheckoutSession(req.user.companyId, plan));
  });

  portal = asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.user) throw new AppError('Unauthorized', 401);
    res.json(await service.createPortalSession(req.user.companyId));
  });
}

/**
 * Stripe webhook receiver. Mounted in app.ts with a raw body parser and BEFORE the JSON
 * parser, so the exact bytes are available for signature verification. Always returns 200
 * once the event is verified, even if our handler logs a soft error, so Stripe doesn't
 * retry indefinitely on issues we've already recorded.
 */
export const billingWebhookHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!billingEnabled) {
    return res.status(503).json({ error: 'Billing not configured' });
  }

  const event = service.verifyWebhook(req);

  try {
    await service.handleEvent(event);
  } catch (err) {
    // Verified but failed to apply — log and still 200 so Stripe stops retrying a bug
    // on our side. The event id is recoverable from the Stripe dashboard if needed.
    logger.error({ err, type: event.type, id: event.id }, 'Failed handling Stripe webhook');
  }

  res.json({ received: true });
});
