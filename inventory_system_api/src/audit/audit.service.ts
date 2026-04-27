import { prisma } from '../lib/prisma';

export class AuditService {
  async log(
    action: string,
    userId: string,
    companyId: string,
    details?: string
  ) {
    await prisma.auditLog.create({
      data: {
        action,
        userId,
        companyId,
        details
      }
    });
  }
}