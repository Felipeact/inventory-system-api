import { prisma } from '../../lib/prisma';

export class AssetRepository {
  create(data: any) {
    return prisma.asset.create({ data });
  }

  findBySerialCode(serialCode: string, companyId: string) {
    return prisma.asset.findFirst({
      where: { serialCode, companyId }
    });
  }

  getAll(companyId: string) {
    return prisma.asset.findMany({
      where: { companyId }
    });
  }

  getById(id: string, companyId: string) {
    return prisma.asset.findFirst({
      where: { id, companyId }
    });
  }

  update(id: string, companyId: string, data: any) {
    return prisma.asset.updateMany({
      where: { id, companyId },
      data
    });
  }

  async delete(id: string, companyId: string) {
    return prisma.asset.deleteMany({
      where: { id, companyId }
    });
  }
}
