import { BaseController } from '../../core/base.controller';
import { AssetService } from './asset.service';
import { asyncHandler } from '../../core/async-handler';

export class AssetController extends BaseController {
  private service = new AssetService();

  create = asyncHandler(async (req: any, res: any) => {
    const data = await this.service.create(
      req.body,
      req.user.companyId,
      req.user.userId
    );

    return this.created(res, data);
  });

  getAll = asyncHandler(async (req: any, res: any) => {
    const data = await this.service.getAll(req.user.companyId);
    return this.ok(res, data);
  });

  getById = asyncHandler(async (req: any, res: any) => {
    const assetId = req.params.id;
    const data = await this.service.getById(assetId, req.user.companyId);
    return this.ok(res, data);
  });

  update = asyncHandler(async (req: any, res: any) => {
    const assetId = req.params.id;

    const data = await this.service.updateAsset(
      assetId,
      req.body,
      req.user.companyId,
      req.user.userId
    );

    return this.ok(res, data);
  });

  delete = asyncHandler(async (req: any, res: any) => {
    const assetId = req.params.id;

    const data = await this.service.deleteAsset(
      assetId,
      req.user.companyId,
      req.user.userId
    );

    return this.ok(res, data);
  });
}