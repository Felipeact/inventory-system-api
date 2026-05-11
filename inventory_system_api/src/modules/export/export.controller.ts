import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { asyncHandler } from '../../core/async-handler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ExportService } from './export.service';

export class ExportController extends BaseController {
  private service = new ExportService();

  productsCsv = asyncHandler(async (req: AuthRequest, res: Response) => {
    const csv = await this.service.productsCsv(req.user!.companyId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="products.csv"'
    );

    return res.send(csv);
  });

  assetsCsv = asyncHandler(async (req: AuthRequest, res: Response) => {
    const csv = await this.service.assetsCsv(req.user!.companyId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="assets.csv"'
    );

    return res.send(csv);
  });

  usersCsv = asyncHandler(async (req: AuthRequest, res: Response) => {
    const csv = await this.service.usersCsv(req.user!.companyId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users.csv"'
    );

    return res.send(csv);
  });

  companyJson = asyncHandler(async (req: AuthRequest, res: Response) => {
    const data = await this.service.companyJson(req.user!.companyId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="company-backup.json"'
    );

    return res.json(data);
  });
}