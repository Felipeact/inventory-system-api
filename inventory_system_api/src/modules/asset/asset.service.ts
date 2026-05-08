import { AssetRepository } from './asset.repository';
import { AuditService } from '../../audit/audit.service';
import { AppError } from '../../core/app-error';

export class AssetService {
  private repo = new AssetRepository();
  private audit = new AuditService();

  async create(dto: any, companyId: string, userId: string) {
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

  getAll(companyId: string, query: any) {
    const search =
      typeof query.search === 'string'
        ? query.search
        : undefined;

    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;

    if (page < 1) {
      throw new AppError('Page must be greater than 0', 400);
    }

    if (limit < 1 || limit > 100) {
      throw new AppError('Limit must be between 1 and 100', 400);
    }

    return this.repo.findAll(companyId, search, page, limit);
  }

  async getById(id: string, companyId: string) {
    const asset = await this.repo.getById(id, companyId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }
    return asset;
  }

  async updateAsset(id: string, dto: any, companyId: string, userId: string) {
    if (!id) {
      throw new AppError('Asset id is required', 400);
    }

    const asset = await this.repo.getById(id, companyId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name.trim();
    if (dto.type) updateData.type = dto.type.trim();
    if (dto.status) updateData.status = dto.status;
    if (dto.description) updateData.description = dto.description.trim();

    const updated = await this.repo.update(id, companyId, updateData);

    await this.audit.log(
      'UPDATE_ASSET',
      userId,
      companyId,
      `Updated asset ${asset.name} with changes: ${JSON.stringify(updateData)}`
    );

    return { message: 'Asset updated successfully', count: updated.count };
  }

  async deleteAsset(id: string, companyId: string, userId: string) {
    if (!id) {
      throw new AppError('Asset id is required', 400);
    }

    const asset = await this.repo.getById(id, companyId);
    if (!asset) {
      throw new AppError('Asset not found', 404);
    }

    const deleted = await this.repo.delete(id, companyId);

    if (deleted.count === 0) {
      throw new AppError('Asset not found', 404);
    }

    await this.audit.log(
      'DELETE_ASSET',
      userId,
      companyId,
      `Deleted asset ${asset.name} with serial code ${asset.serialCode}`
    );

    return { message: 'Asset deleted successfully' };
  }
}