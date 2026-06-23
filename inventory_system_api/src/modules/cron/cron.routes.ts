/**
 * @file cron.routes.ts
 * @description Scheduled-jobs endpoint for an external scheduler (Railway cron or a
 * GitHub Action). Authenticated by a shared secret (CRON_SECRET) in the
 * `x-cron-secret` header — NOT a user/JWT — so a machine can call it unattended.
 * Disabled (404) when CRON_SECRET is unset.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../../core/async-handler';
import { AppError } from '../../core/app-error';
import { env } from '../../config/env';
import { SuperAdminService } from '../super-admin/super-admin.service';

const router = Router();
const service = new SuperAdminService();

/** Timing-safe secret comparison. */
function secretOk(provided: string): boolean {
  if (!env.CRON_SECRET) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(env.CRON_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * POST /cron/daily — run the daily reconcile (sync subscriptions + open quotes from
 * Stripe) and capture today's revenue snapshot. Idempotent; safe to run repeatedly.
 */
router.post(
  '/daily',
  asyncHandler(async (req: Request, res: Response) => {
    const provided = req.header('x-cron-secret') ?? '';
    if (!env.CRON_SECRET || !secretOk(provided)) {
      throw new AppError('Not found', 404); // don't reveal the endpoint exists
    }
    const result = await service.runDailyJobs();
    res.json({ ok: true, ...result });
  }),
);

export default router;
