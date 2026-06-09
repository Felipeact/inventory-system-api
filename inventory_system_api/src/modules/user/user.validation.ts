import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.string().optional(),
    roleName: z.string().optional(),
    status: z.string().optional(),
  }).refine(
    (data) => data.role || data.roleName,
    {
      message: 'Role is required',
      path: ['role'],
    }
  ),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User id is required'),
  }),
  body: z.object({
    name: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
    role: z.string().optional(),
    roleName: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const assignPermissionSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User id is required'),
    permissionName: z.string().min(1, 'Permission name is required'),
  }),
});

export const removePermissionSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User id is required'),
    permissionName: z.string().min(1, 'Permission name is required'),
  }),
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User id is required'),
  }),
});

export const updateCurrentUserProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required').optional(),
    email: z.string().email('Invalid email address').optional(),
  }),
});

export const inviteUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    role: z.string().min(1, 'Role is required'),
    status: z.string().optional(),
  }),
});