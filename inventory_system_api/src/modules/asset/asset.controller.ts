import { BaseController } from '../../core/base.controller';
import { AssetService } from './asset.service';

export class AssetController extends BaseController {
  private service = new AssetService();

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

  getAll = async (req: any, res: any) => {
    try {
      const data = await this.service.getAll(req.user.companyId);
      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  getById = async (req: any, res: any) => {
    try {
      const assetId = req.params.id;
      const data = await this.service.getById(assetId, req.user.companyId);
      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  update = async (req: any, res: any) => {
    try {
      const assetId = req.params.id;

      const data = await this.service.updateAsset(
        assetId,
        req.body,
        req.user.companyId,
        req.user.userId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };

  delete = async (req: any, res: any) => {
    try {
      const assetId = req.params.id;

      const data = await this.service.deleteAsset(
        assetId,
        req.user.companyId,
        req.user.userId
      );

      return this.ok(res, data);
    } catch (e: any) {
      return this.fail(res, e.message);
    }
  };
}
