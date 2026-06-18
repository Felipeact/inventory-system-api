import { Router } from 'express';
import { LeadController } from './lead.controller';
import { leadRateLimiter } from '../../middleware/rate-limit.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createLeadSchema } from './lead.validation';

const router = Router();
const controller = new LeadController();

/** Public: capture a "request a demo" / contact submission and email the owner. */
router.post('/', leadRateLimiter, validate(createLeadSchema), controller.create);

export default router;
