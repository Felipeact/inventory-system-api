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