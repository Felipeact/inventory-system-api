import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { AuthRepository } from './auth.repository';
import { RoleService } from '../role/role.service';
import { AppError } from '../../core/app-error';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../email/email.service';

export class AuthService {
  private repo = new AuthRepository();
  private roleService = new RoleService();
  private audit = new AuditService();
  private emailService = new EmailService();

  async register(dto: any) {
    const { email, password, code, companyName } = dto;

    if (!email || !password || !code || !companyName) {
      throw new AppError(
        'email, password, code, and companyName are required',
        400
      );
    }

    const activation = await this.repo.findCode(code);

    if (!activation || activation.isUsed || !activation.isActive) {
      throw new AppError('Invalid activation code', 401);
    }

    const company = await prisma.company.create({
      data: {
        name: companyName,
        plan: activation.plan,
        subscriptionStatus: 'ACTIVE',
        maxUsers: activation.maxUsers,
        maxProducts: activation.maxProducts
      }
    });

    const { admin } = await this.roleService.createDefaultRoles(company.id);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.repo.createUser({
      email,
      passwordHash,
      companyId: company.id,
      roleId: admin.id
    });

    await this.repo.useCode(code, company.id);

    const accessToken = generateAccessToken({
      userId: user.id,
      companyId: company.id
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      companyId: company.id
    });

    await this.repo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      companyId: company.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await this.audit.log(
      'REGISTER_COMPANY',
      user.id,
      company.id,
      `Registered company ${company.name} with ${company.plan} plan`
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: admin.name,
        mustChangePassword: false
      }
    };
  }

  async login(dto: any) {
    const { email, password } = dto;

    const user = await this.repo.findUser(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      companyId: user.companyId
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      companyId: user.companyId
    });

    await this.repo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      companyId: user.companyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    await this.audit.log(
      'LOGIN',
      user.id,
      user.companyId,
      `User ${user.email} logged in`
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
        mustChangePassword: Boolean((user as any).mustChangePassword)
      }
    };
  }

  async refresh(dto: any) {
    const { refreshToken } = dto;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const storedToken = await this.repo.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    if (storedToken.expiresAt < new Date()) {
      await this.repo.deleteRefreshToken(refreshToken);
      throw new AppError('Refresh token expired', 401);
    }

    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!
    ) as {
      userId: string;
      companyId: string;
    };

    const accessToken = generateAccessToken({
      userId: payload.userId,
      companyId: payload.companyId
    });

    await this.audit.log(
      'REFRESH_TOKEN',
      payload.userId,
      payload.companyId,
      'Access token refreshed'
    );

    return {
      accessToken
    };
  }

  async logout(dto: any) {
    const { refreshToken } = dto;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const storedToken = await this.repo.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new AppError('Invalid refresh token', 401);
    }

    await this.repo.deleteRefreshToken(refreshToken);

    await this.audit.log(
      'LOGOUT',
      storedToken.userId,
      storedToken.companyId,
      'User logged out'
    );

    return {
      message: 'Logged out successfully'
    };
  }

  async requestPasswordReset(dto: any) {
    const { email } = dto;

    if (!email) {
      throw new AppError('Email is required', 400);
    }

    const user = await this.repo.findUser(email);

    if (!user) {
      return {
        message: 'If this email exists, a reset link will be sent'
      };
    }

    const token = crypto.randomBytes(32).toString('hex');

    await this.repo.createPasswordResetToken({
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });

    await this.emailService.sendPasswordResetEmail(email, token);

    await this.audit.log(
      'REQUEST_PASSWORD_RESET',
      user.id,
      user.companyId,
      `Password reset requested for ${email}`
    );

    return {
      message: 'If this email exists, a reset link will be sent'
    };
  }

  async resetPassword(dto: any) {
    const { token, newPassword } = dto;

    if (!token || !newPassword) {
      throw new AppError('Token and new password are required', 400);
    }

    if (newPassword.length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const resetToken = await this.repo.findPasswordResetToken(token);

    if (!resetToken || resetToken.used) {
      throw new AppError('Invalid reset token', 401);
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppError('Reset token expired', 401);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.repo.updateUserPassword(resetToken.userId, passwordHash);

    await this.repo.markPasswordResetTokenUsed(token);

    await this.audit.log(
      'RESET_PASSWORD',
      resetToken.userId,
      resetToken.user.companyId,
      'Password was reset'
    );

    return {
      message: 'Password reset successfully'
    };
  }


  async changePassword(userId: string, companyId: string, dto: any) {
    const { currentPassword, newPassword } = dto;

    if (!currentPassword || !newPassword) {
      throw new AppError('currentPassword and newPassword are required', 400);
    }

    if (String(newPassword).length < 6) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId
      }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);

    if (!valid) {
      throw new AppError('Current password is incorrect', 401);
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });

    await this.audit.log(
      'CHANGE_PASSWORD',
      userId,
      companyId,
      'User changed password'
    );

    return {
      message: 'Password changed successfully'
    };
  }
}
