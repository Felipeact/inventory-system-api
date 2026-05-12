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

  async findAll(companyId: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId
    };

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
