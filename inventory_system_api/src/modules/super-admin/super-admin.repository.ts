import { prisma } from '../../lib/prisma';

export class SuperAdminRepository {
  findByEmail(email: string) {
    return prisma.superAdmin.findUnique({
      where: { email }
    });
  }

  create(data: {
    email: string;
    passwordHash: string;
  }) {
    return prisma.superAdmin.create({
      data
    });
  }

  createActivationCode(data: {
    code: string;
    plan: string;
    maxUsers: number;
    maxProducts: number;
  }) {
    return prisma.activationCode.create({
      data
    });
  }

  findCompanies() {
    return prisma.company.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        users: true,
        products: true
      }
    });
  }

  updateCompanyStatus(companyId: string, status: string) {
    return prisma.company.update({
      where: {
        id: companyId
      },
      data: {
        subscriptionStatus: status
      }
    });
  }

  updateCompanyPlan(
    companyId: string,
    data: {
      plan: string;
      maxUsers: number;
      maxProducts: number;
    }
  ) {
    return prisma.company.update({
      where: {
        id: companyId
      },
      data
    });
  }

  countSuperAdmins() {
    return prisma.superAdmin.count();
  }

  findActivationCodes() {
    return prisma.activationCode.findMany({
      orderBy: {
        id: 'desc'
      }
    });
  }

  deactivateActivationCode(id: string) {
    return prisma.activationCode.update({
      where: { id },
      data: { isActive: false }
    });
  }
}