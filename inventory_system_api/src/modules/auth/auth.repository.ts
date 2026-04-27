import { prisma } from '../../lib/prisma';

export class AuthRepository {
  findCode(code: string) {
    return prisma.activationCode.findUnique({
      where: { code },
    });
  }

  useCode(code: string, companyId: string) {
    return prisma.activationCode.update({
      where: { code },
      data: {
        isUsed: true,
        companyId,
      },
    });
  }

  createUser(data: {
    email: string;
    passwordHash: string;
    companyId: string;
    roleId: string;
  }) {
    return prisma.user.create({
      data,
    });
  }

  findUser(email: string) {
    return prisma.user.findFirst({
      where: { email },
      include: {
        role: true,
      },
    });
  }
}