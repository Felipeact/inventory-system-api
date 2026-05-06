import { BaseController } from '../../core/base.controller';
import { ProductService } from './product.service';

export class ProductController extends BaseController {
  private service = new ProductService();

  create = async (req: any, res: any) => {
    try {
      const data = await this.service.create(
        req.body,
        req.user.companyId,
        req.user.userId
      );

      return this.created(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  scanIn = async (req: any, res: any) => {
    try {
      const { barcode, quantity } = req.body;

      const data = await this.service.scanIn(
        barcode,
        Number(quantity),
        req.user.companyId,
        req.user.userId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  scanOut = async (req: any, res: any) => {
    try {
      const { barcode, quantity } = req.body;

      const data = await this.service.scanOut(
        barcode,
        Number(quantity),
        req.user.companyId,
        req.user.userId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  getAll = async (req: any, res: any) => {
    try {
      const data = await this.service.getAll(req.user.companyId);
      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  delete = async (req: any, res: any) => {
    try {
      const productId = req.params.id;

      const data = await this.service.deleteProduct(
        productId,
        req.user.companyId,
        req.user.userId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };
}