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
    maxUsers: z.number().min(1, 'maxUsers must be at least 1'),
    maxProducts: z.number().min(1, 'maxProducts must be at least 1')
  })
});

export const updateCompanyPlanSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Company id is required')
  }),
  body: z.object({
    plan: z.string().min(1, 'Plan is required'),
    maxUsers: z.number().min(1, 'maxUsers must be at least 1'),
    maxProducts: z.number().min(1, 'maxProducts must be at least 1')
  })
});

export const companyIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Company id is required')
  })
});