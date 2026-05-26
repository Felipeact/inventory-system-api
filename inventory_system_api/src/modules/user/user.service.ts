import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';
import { AppError } from '../../core/app-error';
import { AuditService } from '../../audit/audit.service';

export class UserService {

  private repo = new UserRepository();
  private audit = new AuditService();

  async createUser(
    dto: any,
    companyId: string,
    adminUserId: string
  ) {

    const { name, email, password } = dto;
    const roleName = dto.roleName || dto.role;

    if (!email || !password || !roleName) {
      throw new AppError(
        'email, password, and role are required',
        400
      );
    }

    const company = await this.repo.findCompanyById(companyId);

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    if (company.subscriptionStatus !== 'ACTIVE') {
      throw new AppError(
        'Subscription is not active',
        403
      );
    }

    const userCount = await this.repo.countUsers(companyId);

    if (userCount >= company.maxUsers) {
      throw new AppError(
        `User limit reached for ${company.plan} plan`,
        403
      );
    }

    const normalizedRole =
      String(roleName).toUpperCase();

    const role =
      await this.repo.findRoleByName(
        normalizedRole,
        companyId
      );

    if (!role) {
      throw new AppError('Role not found', 404);
    }

    const passwordHash =
      await bcrypt.hash(password, 10);

    const user = await this.repo.create({
      name: name ? String(name).trim() : '',
      email: String(email).trim(),
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

  async updateUser(
    userId: string,
    dto: any,
    companyId: string,
    adminUserId: string
  ) {

    const { name, email, password } = dto;
    const roleName = dto.roleName || dto.role;

    const existingUser =
      await this.repo.findUserInCompany(
        userId,
        companyId
      );

    if (!existingUser) {
      throw new AppError(
        'User not found in this company',
        404
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      passwordHash?: string;
      roleId?: string;
    } = {};

    if (name !== undefined) {
      updateData.name =
        String(name).trim();
    }

    if (email !== undefined) {
      updateData.email =
        String(email).trim();
    }

    if (
      password !== undefined &&
      String(password).trim() !== ''
    ) {
      updateData.passwordHash =
        await bcrypt.hash(password, 10);
    }

    if (roleName !== undefined) {

      const normalizedRole =
        String(roleName).toUpperCase();

      const role =
        await this.repo.findRoleByName(
          normalizedRole,
          companyId
        );

      if (!role) {
        throw new AppError(
          'Role not found',
          404
        );
      }

      updateData.roleId = role.id;
    }

    const user = await this.repo.update(
      userId,
      companyId,
      updateData
    );

    await this.audit.log(
      'UPDATE_USER',
      adminUserId,
      companyId,
      `Updated user ${userId}`
    );

    return user;
  }

  async assignPermission(
    dto: any,
    companyId: string,
    adminUserId: string
  ) {

    const { userId, permissionName } = dto;

    if (!userId || !permissionName) {
      throw new AppError(
        'userId and permissionName are required',
        400
      );
    }

    const user =
      await this.repo.findUserInCompany(
        userId,
        companyId
      );

    if (!user) {
      throw new AppError(
        'User not found in this company',
        404
      );
    }

    const normalizedPermission =
      String(permissionName).toUpperCase();

    const permission =
      await this.repo.findPermissionByName(
        normalizedPermission
      );

    if (!permission) {
      throw new AppError(
        'Permission not found',
        404
      );
    }

    await this.repo.assignPermission(
      userId,
      permission.id
    );

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

  async removePermission(
    dto: any,
    companyId: string,
    adminUserId: string
  ) {

    const { userId, permissionName } = dto;

    if (!userId || !permissionName) {
      throw new AppError(
        'userId and permissionName are required',
        400
      );
    }

    const user =
      await this.repo.findUserInCompany(
        userId,
        companyId
      );

    if (!user) {
      throw new AppError(
        'User not found in this company',
        404
      );
    }

    const normalizedPermission =
      String(permissionName).toUpperCase();

    const permission =
      await this.repo.findPermissionByName(
        normalizedPermission
      );

    if (!permission) {
      throw new AppError(
        'Permission not found',
        404
      );
    }

    await this.repo.removePermission(
      userId,
      permission.id
    );

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

  async deleteUser(
    userId: string,
    companyId: string,
    adminUserId: string
  ) {

    await this.audit.log(
      'DELETE_USER',
      adminUserId,
      companyId,
      `Deleted user ${userId}`
    );

    return this.repo.delete(
      userId,
      companyId
    );
  }
}