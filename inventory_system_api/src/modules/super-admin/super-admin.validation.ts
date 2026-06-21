import { z } from 'zod';

export const createSuperAdminSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
  })
});

export const superAdminLoginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required')
  })
});

export const createActivationCodeSchema = z.object({
  body: z.object({
    code: z.string().min(3, 'Code must be at least 3 characters'),
    plan: z.string().min(1, 'Plan is required'),
    // Limits are derived from the plan catalog server-side; accepted but ignored
    // if sent, so older clients don't break.
    maxUsers: z.number().optional(),
    maxProducts: z.number().optional()
  })
});

export const updateCompanyPlanSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Company id is required')
  }),
  body: z.object({
    plan: z.string().min(1, 'Plan is required'),
    // Derived from the plan catalog server-side; optional for back-compat.
    maxUsers: z.number().optional(),
    maxProducts: z.number().optional()
  })
});

export const companyIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Company id is required')
  })
});

export const createQuoteSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Company id is required')
  }),
  body: z.object({
    amount: z.number().positive('amount must be greater than 0'),
    interval: z.enum(['monthly', 'biweekly']),
    label: z.string().max(200).optional(),
    setupFee: z.number().nonnegative('setupFee must be 0 or greater').optional(),
    setupLabel: z.string().max(200).optional()
  })
});

export const setCompanyPricingSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Company id is required')
  }),
  body: z.object({
    monthlyPriceOverride: z
      .number()
      .nonnegative('monthlyPriceOverride must be 0 or greater')
      .nullable()
  })
});