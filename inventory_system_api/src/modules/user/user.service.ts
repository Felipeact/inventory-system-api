import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';
import { AppError } from '../../core/app-error';
import { AuditService } from '../../audit/audit.service';

export class UserService {
  private repo = new UserRepository();
  private audit = new AuditService();

  async createUser(dto: any, companyId: string, adminUserId: string) {
    const { email, password, roleName } = dto;

    if (!email || !password || !roleName) {
      throw new AppError('email, password, and roleName are required', 400);
    }

    const company = await this.repo.findCompanyById(companyId);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company.subscriptionStatus !== 'ACTIVE') {
      throw new AppError('Subscription is not active', 403);
    }

    const userCount = await this.repo.countUsers(companyId);

    if (userCount >= company.maxUsers) {
      throw new AppError(
        `User limit reached for ${company.plan} plan`,
        403
      );
    }

    const normalizedRole = roleName.toUpperCase();

    const role = await this.repo.findRoleByName(normalizedRole, companyId);
    if (!role) throw new AppError('Role not found', 404);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.repo.create({
      email,
      passwordHash,
      companyId,
      roleId: role.id,
    });

    await this.audit.log(
      'CREATE_USER',
      adminUserId,
      companyId,
      `Created user ${email} with role ${normalizedRole}`
    );

    return user;
  }

  async assignPermission(dto: any, companyId: string, adminUserId: string) {
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

    await this.audit.log(
      'ASSIGN_PERMISSION',
      adminUserId,
      companyId,
      `Assigned ${normalizedPermission} to user ${userId}`
    );

    return {
      message: 'Permission assigned successfully',
      userId,
      permissionName: normalizedPermission,
    };
  }

  async removePermission(dto: any, companyId: string, adminUserId: string) {
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

    await this.audit.log(
      'REMOVE_PERMISSION',
      adminUserId,
      companyId,
      `Removed ${normalizedPermission} from user ${userId}`
    );

    return {
      message: 'Permission removed successfully',
      userId,
      permissionName: normalizedPermission,
    };
  }

  getUsers(companyId: string) {
    return this.repo.findAll(companyId);
  }

  async deleteUser(userId: string, companyId: string, adminUserId: string) {

    await this.audit.log(
      'DELETE_USER',
      adminUserId,
      companyId,
      `Deleted user ${userId}`
    );


    return this.repo.delete(userId, companyId);
  }
}