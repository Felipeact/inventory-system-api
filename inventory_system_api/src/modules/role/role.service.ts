import { prisma } from '../../lib/prisma';
import { PERMISSIONS } from '../../constants/permissions';

export class RoleService {
  async seedPermissions() {
    for (const name of Object.values(PERMISSIONS)) {
      await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
  }

  async createDefaultRoles(companyId: string) {
    await this.seedPermissions();

    const permissions = await prisma.permission.findMany();

    const admin = await prisma.role.create({
      data: {
        name: 'ADMIN',
        companyId,
      },
    });

    const warehouse = await prisma.role.create({
      data: {
        name: 'WAREHOUSE',
        companyId,
      },
    });

    const adminPermissions = permissions.map((permission) => ({
      roleId: admin.id,
      permissionId: permission.id,
    }));

    const warehousePermissions = permissions
      .filter((permission) =>
        [
          PERMISSIONS.VIEW_STOCK,
          PERMISSIONS.SCAN_IN,
          PERMISSIONS.SCAN_OUT,
        ].includes(permission.name)
      )
      .map((permission) => ({
        roleId: warehouse.id,
        permissionId: permission.id,
      }));

    await prisma.rolePermission.createMany({
      data: [...adminPermissions, ...warehousePermissions],
      skipDuplicates: true,
    });

    return { admin, warehouse };
  }
}