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

  createRefreshToken(data: {
    token: string;
    userId: string;
    companyId: string;
    expiresAt: Date;
  }) {
    return prisma.refreshToken.create({
      data
    });
  }

  findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token }
    });
  }

  deleteRefreshToken(token: string) {
    return prisma.refreshToken.deleteMany({
      where: { token }
    });
  }

  deleteUserRefreshTokens(userId: string) {
    return prisma.refreshToken.deleteMany({
      where: { userId }
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

  createPasswordResetToken(data: {
    token: string;
    userId: string;
    expiresAt: Date;
  }) {
    return prisma.passwordResetToken.create({ data });
  }

  findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });
  }

  markPasswordResetTokenUsed(token: string) {
    return prisma.passwordResetToken.update({
      where: { token },
      data: { used: true }
    });
  }

  updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  
}

