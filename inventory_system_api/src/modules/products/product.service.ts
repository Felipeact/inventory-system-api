import { ProductRepository } from './product.repository';
import { AuditService } from '../../audit/audit.service';
import { AppError } from '../../core/app-error';

function optionalText(value: any): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text === '' ? null : text;
}

export class ProductService {
  private repo = new ProductRepository();
  private audit = new AuditService();

  async create(dto: any, companyId: string, userId: string) {
    const {
      name,
      barcode,
      quantity,
      lowStockThreshold,
      model,
      type,
      location,
      project,
      account,
      status,
      description,
      imageUrl
    } = dto;

    if (!name || !barcode) {
      throw new AppError('name and barcode are required', 400);
    }

    const initialQuantity = Number(quantity ?? 0);
    const threshold = Number(lowStockThreshold ?? 5);

    if (initialQuantity < 0) {
      throw new AppError('quantity cannot be negative', 400);
    }

    if (threshold < 0) {
      throw new AppError('low stock threshold cannot be negative', 400);
    }

    const company = await this.repo.findCompanyById(companyId);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company.subscriptionStatus !== 'ACTIVE') {
      throw new AppError('Subscription is not active', 403);
    }

    const productCount = await this.repo.countProducts(companyId);

    if (productCount >= company.maxProducts) {
      throw new AppError(
        `Product limit reached for ${company.plan} plan`,
        403
      );
    }

    const product = await this.repo.create({
      name: String(name).trim(),
      barcode: String(barcode).trim(),
      companyId,
      lowStockThreshold: threshold,
      model: optionalText(model),
      type: optionalText(type) || 'Product',
      location: optionalText(location) || 'Main Store',
      project: optionalText(project),
      account: optionalText(account),
      status: optionalText(status) || 'Active',
      description: optionalText(description),
      imageUrl: optionalText(imageUrl),
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

  getAll(companyId: string, query: any) {
    const search =
      typeof query.search === 'string' ? query.search : undefined;

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

  async scanIn(
    barcode: string,
    quantity: number,
    companyId: string,
    userId: string
  ) {
    if (!barcode) {
      throw new AppError('Barcode is required', 400);
    }

    const product = await this.repo.findByBarcode(barcode.trim(), companyId);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    const updated = await this.repo.updateInventory(product.id, amount);

    await this.audit.log(
      'SCAN_IN',
      userId,
      companyId,
      `${barcode} +${amount}`
    );

    return updated;
  }

  async scanOut(
    barcode: string,
    quantity: number,
    companyId: string,
    userId: string
  ) {
    if (!barcode) {
      throw new AppError('Barcode is required', 400);
    }

    const product = await this.repo.findByBarcode(barcode.trim(), companyId);

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const amount = Number(quantity);

    if (!amount || amount <= 0) {
      throw new AppError('Quantity must be greater than 0', 400);
    }

    const inventory = await this.repo.getInventory(product.id);

    if (!inventory || inventory.quantity < amount) {
      throw new AppError('Not enough stock', 422);
    }

    const updated = await this.repo.updateInventory(product.id, -amount);

    await this.audit.log(
      'SCAN_OUT',
      userId,
      companyId,
      `${barcode} -${amount}`
    );

    return updated;
  }

  async updateProduct(
    productId: string,
    dto: any,
    companyId: string,
    userId: string
  ) {
    const {
      name,
      barcode,
      quantity,
      lowStockThreshold,
      model,
      type,
      location,
      project,
      account,
      status,
      description,
      imageUrl
    } = dto;

    if (!productId) {
      throw new AppError('Product id is required', 400);
    }

    if (!name || !barcode) {
      throw new AppError('name and barcode are required', 400);
    }

    const parsedQuantity = Number(quantity);
    const threshold = Number(lowStockThreshold ?? 5);

    if (Number.isNaN(parsedQuantity) || parsedQuantity < 0) {
      throw new AppError('quantity must be 0 or greater', 400);
    }

    if (Number.isNaN(threshold) || threshold < 0) {
      throw new AppError('low stock threshold must be 0 or greater', 400);
    }

    const updated = await this.repo.update(productId, companyId, {
      name: String(name).trim(),
      barcode: String(barcode).trim(),
      quantity: parsedQuantity,
      lowStockThreshold: threshold,
      model: optionalText(model),
      type: optionalText(type) || 'Product',
      location: optionalText(location) || 'Main Store',
      project: optionalText(project),
      account: optionalText(account),
      status: optionalText(status) || 'Active',
      description: optionalText(description),
      imageUrl: optionalText(imageUrl)
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

    return {
      message: 'Product deleted successfully'
    };
  }
}
