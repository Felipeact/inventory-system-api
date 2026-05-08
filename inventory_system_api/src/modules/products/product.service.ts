import { ProductRepository } from './product.repository';
import { AuditService } from '../../audit/audit.service';
import { AppError } from '../../core/app-error';

export class ProductService {
  private repo = new ProductRepository();
  private audit = new AuditService();

  async create(dto: any, companyId: string, userId: string) {
    const { name, barcode, quantity, lowStockThreshold } = dto;

    const initialQuantity = Number(quantity ?? 0);
    const threshold = Number(lowStockThreshold ?? 5);

    if (!name || !barcode) {
      throw new AppError('name and barcode are required', 400);
    }

    if (initialQuantity < 0) {
      throw new AppError('quantity cannot be negative', 400);
    }

    const product = await this.repo.create({
      name: name.trim(),
      barcode: barcode.trim(),
      companyId,
      lowStockThreshold: threshold,
      inventory: {
        create: {
          quantity: initialQuantity,
          companyId
        }
      }
    });

    await this.audit.log(
      'CREATE_PRODUCT',
      userId,
      companyId,
      `Created ${product.name} with quantity ${initialQuantity}`
    );

    return product;
  }

  async scanIn(barcode: string, quantity: number, companyId: string, userId: string) {
    const product = await this.repo.findByBarcode(barcode.trim(), companyId);
    if (!product) throw new AppError('Product not found', 404);

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    const updated = await this.repo.updateInventory(product.id, amount);

    await this.audit.log('SCAN_IN', userId, companyId, `${barcode} +${amount}`);

    return updated;
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

  async getById(productId: string, companyId: string) {
  if (!productId) {
    throw new AppError('Product id is required', 400);
  }

  const product = await this.repo.findById(productId, companyId);

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  return product;
}

  async getLowStock(companyId: string) {
    return this.repo.findLowStock(companyId);
  }


  async scanOut(barcode: string, quantity: number, companyId: string, userId: string) {
    const product = await this.repo.findByBarcode(barcode.trim(), companyId);
    if (!product) throw new AppError('Product not found', 404);

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    const inventory = await this.repo.getInventory(product.id);

    if (!inventory || inventory.quantity < amount) {
      throw new AppError('Not enough stock', 422);
    }

    const updated = await this.repo.updateInventory(product.id, -amount);

    await this.audit.log('SCAN_OUT', userId, companyId, `${barcode} -${amount}`);

    return updated;
  }

  async updateProduct(productId: string, dto: any, companyId: string, userId: string) {
    const { name, barcode, quantity } = dto;

    if (!productId) {
      throw new AppError('Product id is required', 400);
    }

    if (!name || !barcode) {
      throw new AppError('name and barcode are required', 400);
    }

    const parsedQuantity = Number(quantity);

    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      throw new AppError('quantity must be 0 or greater', 400);
    }

    const updated = await this.repo.update(productId, companyId, {
      name: name.trim(),
      barcode: barcode.trim(),
      quantity: parsedQuantity
    });

    await this.audit.log(
      'UPDATE_PRODUCT',
      userId,
      companyId,
      `Updated product ${productId}`
    );

    return updated;
  }

  async deleteProduct(productId: string, companyId: string, userId: string) {
    if (!productId) {
      throw new AppError('Product id is required', 400);
    }

    const deleted = await this.repo.delete(productId, companyId);

    if (deleted.count === 0) {
      throw new AppError('Product not found', 404);
    }

    await this.audit.log(
      'DELETE_PRODUCT',
      userId,
      companyId,
      `Deleted product ${productId}`
    );

    return { message: 'Product deleted successfully' };
  }
}