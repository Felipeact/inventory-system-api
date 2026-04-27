import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';

export class UserService {
  private repo = new UserRepository();

  async createUser(dto: any, companyId: string) {
    const { email, password, roleName } = dto;

    if (!email || !password || !roleName) {
      throw new Error('email, password, and roleName are required');
    }

    const normalizedRole = roleName.toUpperCase();

    const role = await this.repo.findRoleByName(normalizedRole, companyId);
    if (!role) throw new Error('Role not found');

    const passwordHash = await bcrypt.hash(password, 10);

    return this.repo.create({
      email,
      passwordHash,
      companyId,
      roleId: role.id,
    });
  }

  async assignPermission(dto: any, companyId: string) {
    const { userId, permissionName } = dto;

    if (!userId || !permissionName) {
      throw new Error('userId and permissionName are required');
    }

    if (typeof userId !== 'string') {
      throw new Error('userId must be a string');
    }

    if (typeof permissionName !== 'string') {
      throw new Error('permissionName must be a string');
    }

    const user = await this.repo.findUserInCompany(userId, companyId);
    if (!user) throw new Error('User not found in this company');

    const normalizedPermission = permissionName.toUpperCase();

    const permission = await this.repo.findPermissionByName(normalizedPermission);
    if (!permission) throw new Error('Permission not found');

    await this.repo.assignPermission(userId, permission.id);

    return {
      message: 'Permission assigned successfully',
      userId,
      permissionName: normalizedPermission,
    };
  }

  async removePermission(dto: any, companyId: string) {
    const { userId, permissionName } = dto;

    if (!userId || !permissionName) {
      throw new Error('userId and permissionName are required');
    }

    if (typeof userId !== 'string') {
      throw new Error('userId must be a string');
    }

    if (typeof permissionName !== 'string') {
      throw new Error('permissionName must be a string');
    }

    const user = await this.repo.findUserInCompany(userId, companyId);
    if (!user) throw new Error('User not found in this company');

    const normalizedPermission = permissionName.toUpperCase();

    const permission = await this.repo.findPermissionByName(normalizedPermission);
    if (!permission) throw new Error('Permission not found');

    await this.repo.removePermission(userId, permission.id);

    return {
      message: 'Permission removed successfully',
      userId,
      permissionName: normalizedPermission,
    };
  }

  getUsers(companyId: string) {
    return this.repo.findAll(companyId);
  }

  deleteUser(userId: string, companyId: string) {
    return this.repo.delete(userId, companyId);
  }
}