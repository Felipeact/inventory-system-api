import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from '../../utils/jwt';
import { AuthRepository } from './auth.repository';
import { RoleService } from '../role/role.service';
import { AppError } from '../../core/app-error';

export class AuthService {
  private repo = new AuthRepository();
  private roleService = new RoleService();

  async register(dto: any) {
    const { email, password, code, companyName } = dto;

    if (!email || !password || !code || !companyName) {
      throw new AppError(
        'email, password, code, and companyName are required',
        400
      );
    }

    const activation = await this.repo.findCode(code);

    if (!activation || activation.isUsed) {
      throw new AppError('Invalid activation code', 401);
    }

    const company = await prisma.company.create({
      data: { name: companyName }
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

    return {
      accessToken,
      refreshToken
    };
  }

  async login(dto: any) {
    const { email, password } = dto;

    const user = await this.repo.findUser(email);
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

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

    return {
      accessToken,
      refreshToken
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

    return {
      accessToken
    };
  }

  async logout(dto: any) {
    const { refreshToken } = dto;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    await this.repo.deleteRefreshToken(refreshToken);

    return {
      message: 'Logged out successfully'
    };
  }
}