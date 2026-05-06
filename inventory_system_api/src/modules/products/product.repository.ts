import { prisma } from '../../lib/prisma';

export class ProductRepository {
  create(data: any) {
    return prisma.product.create({ data });
  }

  findByBarcode(barcode: string, companyId: string) {
    return prisma.product.findFirst({
      where: { barcode, companyId }
    });
  }

  updateInventory(productId: string, delta: number) {
    return prisma.inventory.update({
      where: { productId },
      data: { quantity: { increment: delta } }
    });
  }

  getInventory(productId: string) {
    return prisma.inventory.findUnique({
      where: { productId }
    });
  }

  getAll(companyId: string) {
    return prisma.product.findMany({
      where: { companyId },
      include: { inventory: true }
    });
  }

  async update(productId: string, companyId: string, data: {
    name: string;
    barcode: string;
    quantity: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.updateMany({
        where: {
          id: productId,
          companyId
        },
        data: {
          name: data.name,
          barcode: data.barcode
        }
      });

      if (product.count === 0) {
        throw new Error('Product not found');
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
    return prisma.$transaction(async (tx) => {
      await tx.inventory.deleteMany({
        where: {
          productId,
          companyId
        }
      });

      const deletedProduct = await tx.product.deleteMany({
        where: {
          id: productId,
          companyId
        }
      });

      return deletedProduct;
    });
  }
}