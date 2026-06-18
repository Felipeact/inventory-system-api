import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { SuperAdminRepository } from './super-admin.repository';
import { AppError } from '../../core/app-error';
import { generateSuperAdminToken } from '../../utils/jwt';
import { env } from '../../config/env';

/** bcrypt work factor. 12 is the common 2026 baseline for interactive logins. */
const BCRYPT_ROUNDS = 12;

/** Timing-safe comparison of two secrets that avoids leaking length/content via timing. */
function secretsMatch(provided: string, expected: string): boolean {
    if (!expected) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

export class SuperAdminService {
    private repo = new SuperAdminRepository();

    async createSuperAdmin(dto: any, bootstrapSecret?: string) {
        const { email, password } = dto;

        if (!email || !password) {
            throw new AppError('email and password are required', 400);
        }

        // Bootstrap protection: when a SUPER_ADMIN_BOOTSTRAP_SECRET is configured (always
        // in production), the request must present a matching secret. This stops an
        // attacker from claiming the very first super-admin account on a fresh deploy.
        if (env.SUPER_ADMIN_BOOTSTRAP_SECRET) {
            if (!secretsMatch(bootstrapSecret ?? '', env.SUPER_ADMIN_BOOTSTRAP_SECRET)) {
                throw new AppError('Invalid or missing bootstrap secret', 403);
            }
        } else if (env.NODE_ENV === 'production') {
            // Defensive: env validation already enforces this, but never allow an
            // unauthenticated bootstrap in production even if validation is bypassed.
            throw new AppError('Super-admin bootstrap is disabled', 403);
        }

        const totalAdmins = await this.repo.countSuperAdmins();

        if (totalAdmins > 0) {
            throw new AppError('Super admin already exists', 403);
        }

        const existing = await this.repo.findByEmail(email);

        if (existing) {
            throw new AppError('Super admin already exists', 409);
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

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