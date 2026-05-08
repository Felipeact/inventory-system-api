import { BaseController } from '../../core/base.controller';
import { ProductService } from './product.service';
import { asyncHandler } from '../../core/async-handler';

export class ProductController extends BaseController {
  private service = new ProductService();

  create = asyncHandler(async (req: any, res: any) => {
    const data = await this.service.create(
      req.body,
      req.user.companyId,
      req.user.userId
    );

    return this.created(res, data);
  });

  getById = asyncHandler(async (req: any, res: any) => {
    const data = await this.service.getById(
      req.params.id,
      req.user.companyId
    );

    return this.ok(res, data);
  });

  getLowStock = asyncHandler(async (req: any, res: any) => {
    const data = await this.service.getLowStock(req.user.companyId);
    return this.ok(res, data);
  });

  scanIn = asyncHandler(async (req: any, res: any) => {
    const { barcode, quantity } = req.body;

    const data = await this.service.scanIn(
      barcode,
      Number(quantity),
      req.user.companyId,
      req.user.userId
    );

    return this.ok(res, data);
  });

  scanOut = asyncHandler(async (req: any, res: any) => {
    const { barcode, quantity } = req.body;

    const data = await this.service.scanOut(
      barcode,
      Number(quantity),
      req.user.companyId,
      req.user.userId
    );

    return this.ok(res, data);
  });

  getAll = asyncHandler(async (req: any, res: any) => {
    const data = await this.service.getAll(
      req.user.companyId,
      req.query
    );

    return this.ok(res, data);
  });

  update = asyncHandler(async (req: any, res: any) => {
    const productId = req.params.id;

    const data = await this.service.updateProduct(
      productId,
      req.body,
      req.user.companyId,
      req.user.userId
    );

    return this.ok(res, data);
  });

  delete = asyncHandler(async (req: any, res: any) => {
    const productId = req.params.id;

    const data = await this.service.deleteProduct(
      productId,
      req.user.companyId,
      req.user.userId
    );

    return this.ok(res, data);
  });
}