import { z } from 'zod';

/**
 * Public "request a demo" / contact submission. Kept permissive (most fields
 * optional) so the marketing form can evolve without breaking the API, but the
 * essentials are required and lengths are bounded to prevent abuse.
 */
export const createLeadSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email('A valid work email is required').max(200),
    phone: z.string().max(50).optional(),
    company: z.string().min(1, 'Company is required').max(200),
    companySize: z.string().max(50).optional(),
    trade: z.string().max(50).optional(),
    fleet: z.string().max(50).optional(),
    plan: z.string().max(50).optional(),
    message: z.string().max(2000).optional()
  })
});
