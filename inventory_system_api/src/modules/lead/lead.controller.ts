import { Request, Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { asyncHandler } from '../../core/async-handler';
import { EmailService } from '../email/email.service';
import { logger } from '../../lib/logger';

/**
 * Public lead-capture controller. Receives "request a demo" / contact submissions
 * from the marketing site and forwards them to the platform owner by email.
 * No database model is used — the notification email is the system of record.
 */
export class LeadController extends BaseController {
  private email = new EmailService();

  /** Only these fields are forwarded — ignore any extra keys a client may send. */
  private static readonly FIELDS = [
    'firstName', 'lastName', 'email', 'phone', 'company',
    'companySize', 'trade', 'fleet', 'plan', 'message'
  ] as const;

  create = asyncHandler(async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const lead: Record<string, unknown> = {};
    for (const key of LeadController.FIELDS) {
      if (body[key] !== undefined) lead[key] = body[key];
    }

    // Always log so a lead is never lost even if SMTP is down or unconfigured.
    logger.info({ email: lead.email, company: lead.company }, 'New demo/contact request');

    await this.email.notifyNewLead(lead);

    return this.created(res, {
      message: "Thanks — we've received your request and will be in touch shortly."
    });
  });
}
