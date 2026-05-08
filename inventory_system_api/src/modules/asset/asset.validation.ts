import { z } from 'zod';

export const createAssetSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Asset name is required'),
    type: z.string().min(1, 'Asset type is required'),
    serialCode: z.string().min(1, 'Serial code is required'),
    status: z.string().optional(),
    description: z.string().optional()
  })
});

export const updateAssetSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Asset name is required').optional(),
    type: z.string().min(1, 'Asset type is required').optional(),
    status: z.string().optional(),
    description: z.string().optional()
  }),
  params: z.object({
    id: z.string().min(1, 'Asset id is required')
  })
});

export const assetIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Asset id is required')
  })
});
