import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { generateToken } from '../../utils/jwt';
import { AuthRepository } from './auth.repository';
import { RoleService } from '../role/role.service';

export class AuthService {
  private repo = new AuthRepository();
  private roleService = new RoleService();

  async register(dto: any) {
    const { email, password, code, companyName } = dto;

    if (!email || !password || !code || !companyName) {
      throw new Error('email, password, code, and companyName are required');
    }

    const activation = await this.repo.findCode(code);

    if (!activation || activation.isUsed) {
      throw new Error('Invalid activation code');
    }

    const company = await prisma.company.create({
      data: { name: companyName },
    });

    const { admin } = await this.roleService.createDefaultRoles(company.id);

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.repo.createUser({
      email,
      passwordHash,
      companyId: company.id,
      roleId: admin.id,
    });

    await this.repo.useCode(code, company.id);

    return {
      token: generateToken({
        userId: user.id,
        companyId: company.id,
      }),
    };
  }

  async login(dto: any) {
    const { email, password } = dto;

    const user = await this.repo.findUser(email);
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    return {
      token: generateToken({
        userId: user.id,
        companyId: user.companyId,
      }),
    };
  }
}