import bcrypt from 'bcrypt';
import { SuperAdminRepository } from './super-admin.repository';
import { AppError } from '../../core/app-error';
import { generateSuperAdminToken } from '../../utils/jwt';

export class SuperAdminService {
    private repo = new SuperAdminRepository();

    async createSuperAdmin(dto: any) {
        const { email, password } = dto;

        if (!email || !password) {
            throw new AppError('email and password are required', 400);
        }

        const totalAdmins = await this.repo.countSuperAdmins();

        if (totalAdmins > 0) {
            throw new AppError('Super admin already exists', 403);
        }

        const existing = await this.repo.findByEmail(email);

        if (existing) {
            throw new AppError('Super admin already exists', 409);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        return this.repo.create({
            email,
            passwordHash
        });
    }

    async createActivationCode(dto: any) {
        const { code, plan, maxUsers, maxProducts } = dto;

        if (!code || !plan || !maxUsers || !maxProducts) {
            throw new AppError(
                'code, plan, maxUsers and maxProducts are required',
                400
            );
        }

        return this.repo.createActivationCode({
            code: code.trim(),
            plan: plan.toUpperCase(),
            maxUsers: Number(maxUsers),
            maxProducts: Number(maxProducts)
        });
    }

    async login(dto: any) {
        const { email, password } = dto;

        if (!email || !password) {
            throw new AppError('email and password are required', 400);
        }

        const admin = await this.repo.findByEmail(email);

        if (!admin) {
            throw new AppError('Invalid credentials', 401);
        }

        const valid = await bcrypt.compare(
            password,
            admin.passwordHash
        );

        if (!valid) {
            throw new AppError('Invalid credentials', 401);
        }

        const token = generateSuperAdminToken({
            superAdminId: admin.id,
            email: admin.email
        });

        return {
            token
        };
    }

    listCompanies() {
        return this.repo.findCompanies();
    }

    deactivateCompany(companyId: string) {
        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }

        return this.repo.updateCompanyStatus(companyId, 'INACTIVE');
    }

    activateCompany(companyId: string) {
        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }

        return this.repo.updateCompanyStatus(companyId, 'ACTIVE');
    }

    updateCompanyPlan(companyId: string, dto: any) {
        const { plan, maxUsers, maxProducts } = dto;

        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }

        if (!plan || !maxUsers || !maxProducts) {
            throw new AppError('plan, maxUsers and maxProducts are required', 400);
        }

        return this.repo.updateCompanyPlan(companyId, {
            plan: plan.toUpperCase(),
            maxUsers: Number(maxUsers),
            maxProducts: Number(maxProducts)
        });
    }

    listActivationCodes() {
        return this.repo.findActivationCodes();
    }

    deactivateActivationCode(id: string) {
        if (!id) {
            throw new AppError('Activation code id is required', 400);
        }

        return this.repo.deactivateActivationCode(id);
    }
}