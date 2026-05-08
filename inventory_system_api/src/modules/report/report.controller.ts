import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { asyncHandler } from '../../core/async-handler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { ReportService } from './report.service';

export class ReportController extends BaseController {
    private service = new ReportService();

    inventorySummary = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.inventorySummary(req.user!.companyId);
        return this.ok(res, data);
    });

    assetsSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.assetsSummary(req.user!.companyId);
        return this.ok(res, data);
    });

    auditLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.auditLogs(
            req.user!.companyId,
            req.query
        );

        return this.ok(res, data);
    });

    stockMovements = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.stockMovements(
            req.user!.companyId,
            req.query
        );

        return this.ok(res, data);
    });
}