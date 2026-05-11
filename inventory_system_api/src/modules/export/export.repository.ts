import { prisma } from '../../lib/prisma';

export class ExportRepository {
  getProducts(companyId: string) {
    return prisma.product.findMany({
      where: { companyId },
      include: {
        inventory: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }

  getAssets(companyId: string) {
    return prisma.asset.findMany({
      where: { companyId },
      orderBy: {
        name: 'asc'
      }
    });
  }

  getUsers(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      include: {
        role: true
      },
      orderBy: {
        email: 'asc'
      }
    });
  }

  getCompanyBackup(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: {
          include: {
            role: true,
            extraPermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        roles: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        products: {
          include: {
            inventory: true
          }
        },
        assets: true
      }
    });
  }

  getAuditLogs(companyId: string) {
    return prisma.auditLog.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
}