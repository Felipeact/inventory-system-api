/**
 * @file asset.routes.ts
 * @description Asset management API routes.
 * Defines all endpoints for asset CRUD operations with permission checks.
 * All routes require authentication and subscription validation.
 */

import { Router } from 'express';
import { AssetController } from './asset.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { subscriptionMiddleware } from '../../middleware/subscription.middleware';
import { requirePermission } from '../../middleware/permission.middleware';
import { PERMISSIONS } from '../../constants/permissions';
import { validate } from '../../middleware/validate.middleware';
import { createAssetSchema, updateAssetSchema, assetIdSchema } from './asset.validation';

/** Initialize Express router */
const router = Router();

/** Create controller instance */
const controller = new AssetController();

/**
 * POST /assets
 * Create a new asset
 * Requires: ADD_ASSET permission
 * 
 * @body {Object} Asset data
 * @body {string} name - Asset name
 * @body {string} type - Asset type/category
 * @body {string} serialCode - Unique serial code
 * @body {string} [status] - Asset status (default: 'active')
 * @body {string} [description] - Optional description
 * 
 * @returns {Object} Created asset
 */
router.post(
  '/',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.ADD_ASSET),
  validate(createAssetSchema),
  controller.create
);

/**
 * GET /assets
 * Get all assets with pagination and search
 * Requires: VIEW_ASSET permission
 * 
 * @query {string} [search] - Search term for asset names
 * @query {number} [page=1] - Page number
 * @query {number} [limit=20] - Items per page (max 100)
 * 
 * @returns {Object} Paginated asset list with metadata
 */
router.get(
  '/',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_ASSET),
  controller.getAll
);

/**
 * GET /assets/:id
 * Get asset by ID
 * Requires: VIEW_ASSET permission
 * 
 * @param {string} id - Asset ID
 * 
 * @returns {Object} Asset details
 */
router.get(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.VIEW_ASSET),
  validate(assetIdSchema),
  controller.getById
);

/**
 * PUT /assets/:id
 * Update asset details
 * Requires: EDIT_ASSET permission
 * 
 * @param {string} id - Asset ID
 * @body {Object} Update data
 * @body {string} [name] - Updated name
 * @body {string} [type] - Updated type
 * @body {string} [status] - Updated status
 * @body {string} [description] - Updated description
 * 
 * @returns {Object} Update confirmation
 */
router.put(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.EDIT_ASSET),
  validate(updateAssetSchema),
  controller.update
);

/**
 * DELETE /assets/:id
 * Delete an asset
 * Requires: DELETE_ASSET permission
 * 
 * @param {string} id - Asset ID
 * 
 * @returns {Object} Deletion confirmation
 */
router.delete(
  '/:id',
  authMiddleware,
  subscriptionMiddleware,
  requirePermission(PERMISSIONS.DELETE_ASSET),
  validate(assetIdSchema),
  controller.delete
);

export default router;
