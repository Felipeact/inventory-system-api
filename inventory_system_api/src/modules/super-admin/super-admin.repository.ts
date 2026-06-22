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

  updateCompanyPricing(companyId: string, monthlyPriceOverride: number | null) {
    return prisma.company.update({
      where: { id: companyId },
      data: { monthlyPriceOverride }
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

  /** Upsert today's revenue snapshot (one row per calendar day). */
  upsertRevenueSnapshot(
    day: string,
    metrics: { mrr: number; activeCompanies: number; payingCompanies: number; activeSeats: number }
  ) {
    return prisma.revenueSnapshot.upsert({
      where: { day },
      create: { day, ...metrics },
      update: metrics
    });
  }

  /** Recorded daily MRR history from `sinceDay` (YYYY-MM-DD), oldest → newest. */
  findRevenueSnapshots(sinceDay: string): Promise<{ day: string; mrr: number }[]> {
    return prisma.revenueSnapshot.findMany({
      where: { day: { gte: sinceDay } },
      orderBy: { day: 'asc' },
      select: { day: true, mrr: true }
    });
  }
}