import { AssetRepository } from './asset.repository';
import { AuditService } from '../../audit/audit.service';

export class AssetService {
  private repo = new AssetRepository();
  private audit = new AuditService();

  async create(dto: any, companyId: string, userId: string) {
    const { name, type, serialCode, status, description } = dto;

    if (!name || !type || !serialCode) {
      throw new Error('name, type, and serialCode are required');
    }

    const existingAsset = await this.repo.findBySerialCode(serialCode.trim(), companyId);
    if (existingAsset) {
      throw new Error('Asset with this serial code already exists');
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

  async getAll(companyId: string) {
    return this.repo.getAll(companyId);
  }

  async getById(id: string, companyId: string) {
    const asset = await this.repo.getById(id, companyId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    return asset;
  }

  async updateAsset(id: string, dto: any, companyId: string, userId: string) {
    if (!id) {
      throw new Error('Asset id is required');
    }

    const asset = await this.repo.getById(id, companyId);
    if (!asset) {
      throw new Error('Asset not found');
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
      throw new Error('Asset id is required');
    }

    const asset = await this.repo.getById(id, companyId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const deleted = await this.repo.delete(id, companyId);

    if (deleted.count === 0) {
      throw new Error('Asset not found');
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
