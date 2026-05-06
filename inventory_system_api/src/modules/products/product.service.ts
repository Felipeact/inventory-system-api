import { ProductRepository } from './product.repository';
import { AuditService } from '../../audit/audit.service';

export class ProductService {
  private repo = new ProductRepository();
  private audit = new AuditService();

  async create(dto: any, companyId: string, userId: string) {
    const { name, barcode, quantity } = dto;

    const initialQuantity = Number(quantity ?? 0);

    if (!name || !barcode) {
      throw new Error('name and barcode are required');
    }

    if (initialQuantity < 0) {
      throw new Error('quantity cannot be negative');
    }

    const product = await this.repo.create({
      name: name.trim(),
      barcode: barcode.trim(),
      companyId,
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
    if (!product) throw new Error('Product not found');

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const updated = await this.repo.updateInventory(product.id, amount);

    await this.audit.log('SCAN_IN', userId, companyId, `${barcode} +${amount}`);

    return updated;
  }

  async getAll(companyId: string) {
    return this.repo.getAll(companyId);
  }


  async scanOut(barcode: string, quantity: number, companyId: string, userId: string) {
    const product = await this.repo.findByBarcode(barcode.trim(), companyId);
    if (!product) throw new Error('Product not found');

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const inventory = await this.repo.getInventory(product.id);

    if (!inventory || inventory.quantity < amount) {
      throw new Error('Not enough stock');
    }

    const updated = await this.repo.updateInventory(product.id, -amount);

    await this.audit.log('SCAN_OUT', userId, companyId, `${barcode} -${amount}`);

    return updated;
  }

  async updateProduct(productId: string, dto: any, companyId: string, userId: string) {
    const { name, barcode, quantity } = dto;

    if (!productId) {
      throw new Error('Product id is required');
    }

    if (!name || !barcode) {
      throw new Error('name and barcode are required');
    }

    const parsedQuantity = Number(quantity);

    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      throw new Error('quantity must be 0 or greater');
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
      throw new Error('Product id is required');
    }

    const deleted = await this.repo.delete(productId, companyId);

    if (deleted.count === 0) {
      throw new Error('Product not found');
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