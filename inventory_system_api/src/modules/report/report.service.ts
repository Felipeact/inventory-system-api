import { AppError } from '../../core/app-error';
import { ReportRepository } from './report.repository';

export class ReportService {
    private repo = new ReportRepository();

    inventorySummary(companyId: string) {
        return this.repo.inventorySummary(companyId);
    }

    assetsSummary(companyId: string) {
        return this.repo.assetsSummary(companyId);
    }

    auditLogs(companyId: string, query: any) {
        const page = query.page ? Number(query.page) : 1;
        const limit = query.limit ? Number(query.limit) : 20;

        if (page < 1) {
            throw new AppError('Page must be greater than 0', 400);
        }

        if (limit < 1 || limit > 100) {
            throw new AppError('Limit must be between 1 and 100', 400);
        }

        return this.repo.auditLogs(companyId, page, limit);
    }

    stockMovements(companyId: string, query: any) {
        const page = query.page ? Number(query.page) : 1;
        const limit = query.limit ? Number(query.limit) : 20;

        if (page < 1) {
            throw new AppError('Page must be greater than 0', 400);
        }

        if (limit < 1 || limit > 100) {
            throw new AppError('Limit must be between 1 and 100', 400);
        }

        return this.repo.stockMovements(companyId, page, limit);
    }
}