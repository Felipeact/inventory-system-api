/**
 * @file asset.controller.ts
 * @description Asset management controller.
 * Handles HTTP requests for creating, reading, updating, and deleting assets.
 * Extends BaseController for consistent response formatting.
 */

import { BaseController } from '../../core/base.controller';
import { Response } from 'express';
import { AssetService } from './asset.service';
import { asyncHandler } from '../../core/async-handler';

/**
 * AssetController - Handles asset management endpoints
 * 
 * @class AssetController
 * @extends BaseController
 */
export class AssetController extends BaseController {
  /** Asset service instance for business logic */
  private service = new AssetService();

  /**
   * Create a new asset
   * 
   * @async
   * @param {any} req - Request with asset data and user context
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 201 with created asset
   */
  create = asyncHandler(async (req: any, res: Response) => {
    const data = await this.service.create(
      req.body,
      req.user.companyId,
      req.user.userId
    );
    return this.created(res, data);
  });

  /**
   * Get all assets for company with pagination and search
   * 
   * @async
   * @param {any} req - Request with query parameters
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with paginated asset list
   */
  getAll = asyncHandler(async (req: any, res: Response) => {
    const data = await this.service.getAll(
      req.user.companyId,
      req.query
    );
    return this.ok(res, data);
  });

  /**
   * Get asset by ID
   * 
   * @async
   * @param {any} req - Request with asset ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with asset details
   */
  getById = asyncHandler(async (req: any, res: Response) => {
    const assetId = req.params.id;
    const data = await this.service.getById(assetId, req.user.companyId);
    return this.ok(res, data);
  });

  /**
   * Update asset details
   * 
   * @async
   * @param {any} req - Request with asset ID and update data
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with update confirmation
   */
  update = asyncHandler(async (req: any, res: Response) => {
    const assetId = req.params.id;
    const data = await this.service.updateAsset(
      assetId,
      req.body,
      req.user.companyId,
      req.user.userId
    );
    return this.ok(res, data);
  });

  /**
   * Delete an asset
   * 
   * @async
   * @param {any} req - Request with asset ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Returns 200 with deletion confirmation
   */
  delete = asyncHandler(async (req: any, res: Response) => {
    const assetId = req.params.id;
    const data = await this.service.deleteAsset(
      assetId,
      req.user.companyId,
      req.user.userId
    );
    return this.ok(res, data);
  });
}