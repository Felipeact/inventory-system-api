/**
 * @file asset.repository.ts
 * @description Data access layer for asset operations.
 * Handles all database queries related to asset creation, retrieval, updating, and deletion.
 * Provides filtering, pagination, and search capabilities.
 */

import { prisma } from '../../lib/prisma';

/**
 * AssetRepository - Data access for asset operations
 * 
 * @class AssetRepository
 */
export class AssetRepository {
  /**
   * Create a new asset
   * 
   * @param {Object} data - Asset data to create
   * @returns {Promise<Asset>} Created asset
   */
  create(data: any) {
    return prisma.asset.create({ data });
  }

  /**
   * Find asset by serial code within a company
   * 
   * @param {string} serialCode - Serial code to find
   * @param {string} companyId - Company ID for isolation
   * @returns {Promise<Asset|null>} Asset or null if not found
   */
  findBySerialCode(serialCode: string, companyId: string) {
    return prisma.asset.findFirst({
      where: { serialCode, companyId }
    });
  }

  /**
   * Find all assets for a company with pagination and search
   * 
   * @param {string} companyId - Company ID
   * @param {string} [search] - Optional search term for asset names
   * @param {number} [page=1] - Page number for pagination
   * @param {number} [limit=20] - Items per page
   * @returns {Promise<Object>} Paginated results with metadata
   */
  async findAll(companyId: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
      ];
    }

    // Fetch data and total count in parallel
    const [data, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          name: 'asc'
        }
      }),
      prisma.asset.count({
        where
      })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get asset by ID within a company
   * 
   * @param {string} id - Asset ID
   * @param {string} companyId - Company ID for isolation
   * @returns {Promise<Asset|null>} Asset or null if not found
   */
  getById(id: string, companyId: string) {
    return prisma.asset.findFirst({
      where: { id, companyId }
    });
  }

  /**
   * Update asset within a company
   * 
   * @param {string} id - Asset ID
   * @param {string} companyId - Company ID for isolation
   * @param {Object} data - Fields to update
   * @returns {Promise<Object>} Update result with count
   */
  update(id: string, companyId: string, data: any) {
    return prisma.asset.updateMany({
      where: { id, companyId },
      data
    });
  }

  /**
   * Delete asset within a company
   * 
   * @param {string} id - Asset ID
   * @param {string} companyId - Company ID for isolation
   * @returns {Promise<Object>} Deletion result with count
   */
  async delete(id: string, companyId: string) {
    return prisma.asset.deleteMany({
      where: { id, companyId }
    });
  }
}
