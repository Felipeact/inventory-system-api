import { prisma } from '../../lib/prisma';
import { AppError } from '../../core/app-error';

export class ProductRepository {
  private productInclude = {
    inventory: true
  };

  async create(data: any) {
    return prisma.product.create({
      data,
      include: this.productInclude
    });
  }

  async findAll(
    companyId: string,
    search?: string,
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
        { project: { contains: search, mode: 'insensitive' } },
        { account: { contains: search, mode: 'insensitive' } },
        { status: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [data, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: this.productInclude,
        skip,
        take: limit,
        orderBy: {
          name: 'asc'
        }
      }),

      prisma.product.count({
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

  async findById(productId: string, companyId: string) {
    return prisma.product.findFirst({
      where: {
        id: productId,
        companyId
      },
      include: this.productInclude
    });
  }

  async findByBarcode(barcode: string, companyId: string) {
    return prisma.product.findFirst({
      where: {
        barcode,
        companyId
      },
      include: this.productInclude
    });
  }

  async getInventory(productId: string) {
    return prisma.inventory.findFirst({
      where: {
        productId
      }
    });
  }

  async updateInventory(productId: string, amount: number) {
    return prisma.inventory.update({
      where: {
        productId
      },
      data: {
        quantity: {
          increment: amount
        }
      }
    });
  }

  async findLowStock(companyId: string) {
    const products = await prisma.product.findMany({
      where: {
        companyId
      },
      include: this.productInclude
    });

    return products.filter((product) => {
      if (!product.inventory) return false;

      return (
        product.inventory.quantity <= product.lowStockThreshold
      );
    });
  }

  async update(
    productId: string,
    companyId: string,
    data: {
      name: string;
      barcode: string;
      quantity: number;
      lowStockThreshold: number;
      model?: string | null;
      type?: string | null;
      location?: string | null;
      project?: string | null;
      account?: string | null;
      status?: string | null;
      description?: string | null;
      imageUrl?: string | null;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.updateMany({
        where: {
          id: productId,
          companyId
        },
        data: {
          name: data.name,
          barcode: data.barcode,
          lowStockThreshold: data.lowStockThreshold,
          model: data.model,
          type: data.type,
          location: data.location,
          project: data.project,
          account: data.account,
          status: data.status,
          description: data.description,
          imageUrl: data.imageUrl
        }
      });

      if (product.count === 0) {
        throw new AppError('Product not found', 404);
      }

      await tx.inventory.updateMany({
        where: {
          productId,
          companyId
        },
        data: {
          quantity: data.quantity
        }
      });

      return tx.product.findFirst({
        where: {
          id: productId,
          companyId
        },
        include: {
          inventory: true
        }
      });
    });
  }

  async delete(productId: string, companyId: string) {
    await prisma.inventory.deleteMany({
      where: {
        productId,
        companyId
      }
    });

    return prisma.product.deleteMany({
      where: {
        id: productId,
        companyId
      }
    });
  }

  findCompanyById(companyId: string) {
    return prisma.company.findUnique({
      where: {
        id: companyId
      }
    });
  }

  countProducts(companyId: string) {
    return prisma.product.count({
      where: {
        companyId
      }
    });
  }
}
