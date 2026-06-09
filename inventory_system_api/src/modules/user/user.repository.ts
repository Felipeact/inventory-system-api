import { prisma } from '../../lib/prisma';

export class UserRepository {

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    companyId: string;
    roleId: string;
  }) {
    return prisma.user.create({
      data,
      include: {
        role: true,
      },
    });
  }

  async update(
    id: string,
    companyId: string,
    data: {
      name?: string;
      email?: string;
      passwordHash?: string;
      roleId?: string;
    }
  ) {
    await prisma.user.updateMany({
      where: {
        id,
        companyId,
      },
      data,
    });

    return prisma.user.findFirst({
      where: {
        id,
        companyId,
      },
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

  updateCurrentUserProfile(
  userId: string,
  companyId: string,
  data: {
    name?: string;
    email?: string;
  }
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data,
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

  async resetPassword(
  userId: string,
  companyId: string,
  passwordHash: string
) {
  return prisma.user.updateMany({
    where: {
      id: userId,
      companyId
    },
    data: {
      passwordHash
    }
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