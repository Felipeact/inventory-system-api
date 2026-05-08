import { prisma } from '../../lib/prisma';

export class ReportRepository {
    async inventorySummary(companyId: string) {
        const products = await prisma.product.findMany({
            where: { companyId },
            include: {
                inventory: true
            }
        });

        const totalProducts = products.length;

        const totalQuantity = products.reduce((sum, product) => {
            return sum + (product.inventory?.quantity ?? 0);
        }, 0);

        const lowStockCount = products.filter((product) => {
            if (!product.inventory) return false;
            return product.inventory.quantity <= product.lowStockThreshold;
        }).length;

        return {
            totalProducts,
            totalQuantity,
            lowStockCount
        };
    }

    async assetsSummary(companyId: string) {
        const assets = await prisma.asset.findMany({
            where: { companyId }
        });

        const totalAssets = assets.length;

        const activeAssets = assets.filter((asset: any) => {
            return asset.status === 'ACTIVE';
        }).length;

        const inactiveAssets = assets.filter((asset: any) => {
            return asset.status === 'INACTIVE';
        }).length;

        return {
            totalAssets,
            activeAssets,
            inactiveAssets
        };
    }

    async auditLogs(companyId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: { companyId },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),

            prisma.auditLog.count({
                where: { companyId }
            })
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async stockMovements(companyId: string, page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: {
                    companyId,
                    action: {
                        in: ['SCAN_IN', 'SCAN_OUT']
                    }
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                }
            }),

            prisma.auditLog.count({
                where: {
                    companyId,
                    action: {
                        in: ['SCAN_IN', 'SCAN_OUT']
                    }
                }
            })
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
}