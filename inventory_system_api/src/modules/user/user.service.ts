import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';
import { AppError } from '../../core/app-error';

export class UserService {
  private repo = new UserRepository();

  async createUser(dto: any, companyId: string) {
    const { email, password, roleName } = dto;

    if (!email || !password || !roleName) {
      throw new AppError('email, password, and roleName are required', 400);
    }

    const normalizedRole = roleName.toUpperCase();

    const role = await this.repo.findRoleByName(normalizedRole, companyId);
    if (!role) throw new AppError('Role not found', 404);

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
      throw new AppError('userId and permissionName are required', 400);
    }

    if (typeof userId !== 'string') {
      throw new AppError('userId must be a string', 400);
    }

    if (typeof permissionName !== 'string') {
      throw new AppError('permissionName must be a string', 400);
    }

    const user = await this.repo.findUserInCompany(userId, companyId);
    if (!user) throw new AppError('User not found in this company', 404);

    const normalizedPermission = permissionName.toUpperCase();

    const permission = await this.repo.findPermissionByName(normalizedPermission);
    if (!permission) throw new AppError('Permission not found', 404);

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
      throw new AppError('userId and permissionName are required', 400);
    }

    if (typeof userId !== 'string') {
      throw new AppError('userId must be a string', 400);
    }

    if (typeof permissionName !== 'string') {
      throw new AppError('permissionName must be a string', 400);
    }

    const user = await this.repo.findUserInCompany(userId, companyId);
    if (!user) throw new AppError('User not found in this company', 404);

    const normalizedPermission = permissionName.toUpperCase();

    const permission = await this.repo.findPermissionByName(normalizedPermission);
    if (!permission) throw new AppError('Permission not found', 404);

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