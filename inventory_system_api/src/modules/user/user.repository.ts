import { prisma } from '../../lib/prisma';

export class UserRepository {
  create(data: {
    email: string;
    passwordHash: string;
    companyId: string;
    roleId: string;
  }) {
    return prisma.user.create({
      data,
    });
  }

  findRoleByName(name: string, companyId: string) {
    return prisma.role.findUnique({
      where: {
        name_companyId: {
          name,
          companyId,
        },
      },
    });
  }

  findPermissionByName(name: string) {
    return prisma.permission.findUnique({
      where: { name },
    });
  }

  findUserInCompany(userId: string, companyId: string) {
    return prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });
  }

  assignPermission(userId: string, permissionId: string) {
    return prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId,
          permissionId,
        },
      },
      update: {},
      create: {
        userId,
        permissionId,
      },
    });
  }

  removePermission(userId: string, permissionId: string) {
    return prisma.userPermission.deleteMany({
      where: {
        userId,
        permissionId,
      },
    });
  }

  findAll(companyId: string) {
    return prisma.user.findMany({
      where: { companyId },
      include: {
        role: true,
        userPermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  findCompanyById(companyId: string) {
    return prisma.company.findUnique({
      where: { id: companyId }
    });
  }

  countUsers(companyId: string) {
    return prisma.user.count({
      where: { companyId }
    });
  }

  delete(id: string, companyId: string) {
    return prisma.user.deleteMany({
      where: {
        id,
        companyId,
      },
    });
  }
}