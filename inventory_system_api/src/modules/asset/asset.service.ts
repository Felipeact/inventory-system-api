/**
 * @file asset.service.ts
 * @description Asset management business logic.
 * Handles creation, retrieval, updating, and deletion of assets with validation and auditing.
 */

import { AssetRepository } from './asset.repository';
import { AuditService } from '../../audit/audit.service';
import { AppError } from '../../core/app-error';

/**
 * AssetService - Asset management business logic
 * 
 * @class AssetService
 */
export class AssetService {
  /** Asset data access layer */
  private repo = new AssetRepository();
  /** Service for audit logging */
  private audit = new AuditService();
  
  /**
   * Create a new asset
   * 
   * @async
   * @param {Object} dto - Asset creation data
   * @param {string} dto.name - Asset name
   * @param {string} dto.type - Asset type/category
   * @param {string} dto.serialCode - Unique serial code
   * @param {string} [dto.status] - Asset status (defaults to 'active')
   * @param {string} [dto.description] - Asset description
   * @param {string} companyId - Company ID for isolation
   * @param {string} userId - User ID performing the action
   * 
   * @returns {Promise<Asset>} Created asset
   * 
   * @throws {AppError} 400 - If required fields missing
   * @throws {AppError} 409 - If serial code already exists
   * 
   * @description
   * 1. Validates required fields (name, type, serialCode)
   * 2. Checks serial code uniqueness within company
   * 3. Creates asset with trimmed inputs
   * 4. Logs creation to audit trail
   */
    const { name, type, serialCode, status, description } = dto;

    if (!name || !type || !serialCode) {
      throw new AppError('name, type, and serialCode are required', 400);
    }

    const existingAsset = await this.repo.findBySerialCode(serialCode.trim(), companyId);
    if (existingAsset) {
      throw new AppError('Asset with this serial code already exists', 409);
    }

    const asset = await this.repo.create({
      name: name.trim(),
      type: type.trim(),
      serialCode: serialCode.trim(),
      status: status || 'active',
      description: description ? description.trim() : null,
      companyId
    });

    await this.audit.log(
      'CREATE_ASSET',
      userId,
      companyId,
      `Created asset ${asset.name} (${asset.type}) with serial code ${asset.serialCode}`
    );

    return asset;
  }

  /**
   * Get all assets for a company with pagination and search
   * 
   * @param {string} companyId - Company ID
   * @param {Object} query - Query parameters
   * @param {string} [query.search] - Search term for asset names
   * @param {number} [query.page] - Page number (default 1)
   * @param {number} [query.limit] - Items per page, 1-100 (default 20)
   * 
   * @returns {Promise<Object>} Paginated results with total count
   * 
   * @throws {AppError} 400 - If page < 1 or limit out of range
   * 
   * @description
   * 1. Parses and validates pagination parameters
   * 2. Delegates to repository for filtered query
   * 3. Returns data with pagination metadata
   */

  /**
   * Get asset by ID
   * 
   * @async
   * @param {string} id - Asset ID
   * @param {string} companyId - Company ID for isolation
   * 
   * @returns {Promise<Asset>} Asset details
   * 
   * @throws {AppError} 404 - If asset not found
   */

  /**
   * Update asset details
   * 
   * @async
   * @param {string} id - Asset ID
   * @param {Object} dto - Update data (all fields optional)
   * @param {string} [dto.name] - Updated name
   * @param {string} [dto.type] - Updated type
   * @param {string} [dto.status] - Updated status
   * @param {string} [dto.description] - Updated description
   * @param {string} companyId - Company ID for isolation
   * @param {string} userId - User ID performing the action
   * 
   * @returns {Promise<Object>} Update confirmation and count
   * 
   * @throws {AppError} 400 - If asset ID not provided
   * @throws {AppError} 404 - If asset not found
   * 
   * @description
   * 1. Validates asset ID provided
   * 2. Checks asset exists for company
   * 3. Builds update object with only provided fields
   * 4. Performs update and logs to audit trail
   */

  /**
   * Delete an asset
   * 
   * @async
   * @param {string} id - Asset ID
   * @param {string} companyId - Company ID for isolation
   * @param {string} userId - User ID performing the action
   * 
   * @returns {Promise<Object>} Deletion confirmation
   * 
   * @throws {AppError} 400 - If asset ID not provided
   * @throws {AppError} 404 - If asset not found
   * 
   * @description
   * 1. Validates asset ID provided
   * 2. Retrieves asset to confirm existence and get details
   * 3. Deletes asset
   * 4. Logs deletion to audit trail
   */