import { z } from 'zod';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    roleName: z.string().min(1, 'Role name is required')
  })
});

export const assignPermissionSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User id is required'),
    permissionName: z.string().min(1, 'Permission name is required')
  })
});

export const removePermissionSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User id is required'),
    permissionName: z.string().min(1, 'Permission name is required')
  })
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User id is required')
  })
});
