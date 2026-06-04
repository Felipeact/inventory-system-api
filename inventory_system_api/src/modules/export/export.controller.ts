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

  productsXlsx = asyncHandler(async (req: AuthRequest, res: Response) => {
    const buffer = await this.service.productsXlsx(req.user!.companyId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="products.xlsx"'
    );

    return res.send(buffer);
  });

  assetsXlsx = asyncHandler(async (req: AuthRequest, res: Response) => {
    const buffer = await this.service.assetsXlsx(req.user!.companyId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="assets.xlsx"'
    );

    return res.send(buffer);
  });

  usersXlsx = asyncHandler(async (req: AuthRequest, res: Response) => {
    const buffer = await this.service.usersXlsx(req.user!.companyId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users.xlsx"'
    );

    return res.send(buffer);
  });

  productsPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
    const buffer = await this.service.productsPdf(req.user!.companyId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="products.pdf"'
    );

    return res.send(buffer);
  });

  assetsPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
    const buffer = await this.service.assetsPdf(req.user!.companyId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="assets.pdf"'
    );

    return res.send(buffer);
  });

  usersPdf = asyncHandler(async (req: AuthRequest, res: Response) => {
    const buffer = await this.service.usersPdf(req.user!.companyId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="users.pdf"'
    );

    return res.send(buffer);
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