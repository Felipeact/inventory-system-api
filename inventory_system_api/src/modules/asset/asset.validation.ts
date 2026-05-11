/**
 * @file asset.validation.ts
 * @description Request validation schemas for asset endpoints.
 * Uses Zod for schema validation of asset creation and updates.
 */

import { z } from 'zod';

/**
 * Schema for POST /assets request validation
 * Validates required and optional fields for asset creation
 * 
 * @type {ZodType}
 */
export const createAssetSchema = z.object({
  body: z.object({
    /** Asset name (required) */
    name: z.string().min(1, 'Asset name is required'),
    /** Asset type/category (required) */
    type: z.string().min(1, 'Asset type is required'),
    /** Unique serial code (required) */
    serialCode: z.string().min(1, 'Serial code is required'),
    /** Asset status (optional, defaults to 'active') */
    status: z.string().optional(),
    /** Asset description (optional) */
    description: z.string().optional()
  })
});

/**
 * Schema for PUT /assets/:id request validation
 * Validates all fields are optional for partial updates
 * Validates asset ID in params
 * 
 * @type {ZodType}
 */
export const updateAssetSchema = z.object({
  body: z.object({
    /** Updated asset name (optional) */
    name: z.string().min(1, 'Asset name is required').optional(),
    /** Updated asset type (optional) */
    type: z.string().min(1, 'Asset type is required').optional(),
    /** Updated status (optional) */
    status: z.string().optional(),
    /** Updated description (optional) */
    description: z.string().optional()
  }),
  params: z.object({
    /** Asset ID from URL params (required) */
    id: z.string().min(1, 'Asset id is required')
  })
});

/**
 * Schema for asset ID parameter validation
 * Used by GET and DELETE endpoints
 * 
 * @type {ZodType}
 */
export const assetIdSchema = z.object({
  params: z.object({
    /** Asset ID from URL params (required) */
    id: z.string().min(1, 'Asset id is required')
  })
});
