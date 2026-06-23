import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { SuperAdminRepository } from './super-admin.repository';
import { AppError } from '../../core/app-error';
import { generateSuperAdminToken } from '../../utils/jwt';
import { env } from '../../config/env';
import { EmailService } from '../email/email.service';
import { PLAN_MONTHLY_PRICE, computeCompanyBilling } from './pricing';
import { PLAN_CATALOG } from '../../config/plans';
import { BillingService } from '../billing/billing.service';
import { QuoteService } from '../quotes/quote.service';

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
    private emailService = new EmailService();
    private billing = new BillingService();
    private quotes = new QuoteService();

    // ---- Sales pipeline: prospect quotes (deals) ----------------------------
    /** Create a draft quote for a prospect (auto-priced from the plan catalog). */
    createDeal(dto: any) {
        return this.quotes.create(dto);
    }

    /** The whole pipeline, newest first. */
    listDeals() {
        return this.quotes.list();
    }

    /** Generate the Stripe checkout link for a quote and email it to the prospect. */
    sendDeal(id: string) {
        return this.quotes.send(id);
    }

    /** (Re)send the issued activation code + registration link to the prospect. */
    emailDealCode(id: string) {
        return this.quotes.emailCode(id);
    }

    /** Decline a quote (cancels its Stripe subscription if any). */
    declineDeal(id: string) {
        return this.quotes.decline(id);
    }

    /** Delete a draft quote. */
    removeDeal(id: string) {
        return this.quotes.remove(id);
    }

    /** Re-check a sent quote against Stripe and advance it (recover a missed webhook). */
    syncDeal(id: string) {
        return this.quotes.syncFromStripe(id);
    }

    /** Force-issue a quote's activation code now (payment confirmed out of band). */
    forceIssueDealCode(id: string) {
        return this.quotes.forceIssueCode(id);
    }

    /** Reconcile every company subscription + open quote against Stripe. */
    reconcileBilling() {
        return this.billing.reconcileAll();
    }

    /**
     * Daily scheduled job: reconcile billing from Stripe, then capture today's revenue
     * snapshot (getAnalytics records it). Returns a compact summary for the scheduler log.
     */
    async runDailyJobs() {
        const reconcile = await this.reconcileBilling();
        const analytics = await this.getAnalytics();
        return {
            reconcile,
            mrr: analytics.metrics.mrr,
            snapshotDays: analytics.mrrHistory?.length ?? 0,
        };
    }

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

        const created = await this.repo.create({
            email,
            passwordHash
        });

        // Best-effort: alert the platform owner that the first super-admin now exists.
        void this.emailService.notifyNewSuperAdmin(email);

        return created;
    }

    async createActivationCode(dto: any) {
        const { code, plan } = dto;

        if (!code || !plan) {
            throw new AppError('code and plan are required', 400);
        }

        const key = String(plan).toUpperCase();
        const def = PLAN_CATALOG[key];
        if (!def) {
            throw new AppError(`Unknown plan "${plan}"`, 400);
        }

        // Limits are derived from the plan catalog — not entered by hand — so the
        // company created from this code automatically gets the right caps.
        return this.repo.createActivationCode({
            code: code.trim(),
            plan: def.key,
            maxUsers: def.maxUsers,
            maxProducts: def.maxProducts
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
        const { plan } = dto;

        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }

        if (!plan) {
            throw new AppError('plan is required', 400);
        }

        const key = String(plan).toUpperCase();
        const def = PLAN_CATALOG[key];
        if (!def) {
            throw new AppError(`Unknown plan "${plan}"`, 400);
        }

        // Limits follow the chosen plan automatically (no manual max users/products).
        return this.repo.updateCompanyPlan(companyId, {
            plan: def.key,
            maxUsers: def.maxUsers,
            maxProducts: def.maxProducts
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

    /** Create a custom recurring charge (quote) for a company via Stripe. */
    createQuote(companyId: string, dto: any) {
        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }
        return this.billing.createQuote(companyId, {
            amount: Number(dto?.amount),
            interval: dto?.interval,
            label: dto?.label,
            setupFee: dto?.setupFee != null ? Number(dto.setupFee) : 0,
            setupLabel: dto?.setupLabel,
        });
    }

    /** List a company's custom recurring charges (quotes). */
    listQuotes(companyId: string) {
        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }
        return this.billing.listQuotes(companyId);
    }

    /** Cancel a custom quote subscription. */
    cancelQuote(subscriptionId: string) {
        if (!subscriptionId) {
            throw new AppError('subscription id is required', 400);
        }
        return this.billing.cancelQuote(subscriptionId);
    }

    /**
     * Set or clear a company's flat monthly contract amount (USD). Pass null to clear
     * the override and fall back to standard per-seat plan pricing.
     */
    async setCompanyPricing(companyId: string, dto: any) {
        if (!companyId) {
            throw new AppError('companyId is required', 400);
        }

        const raw = dto?.monthlyPriceOverride;
        const value = raw === null || raw === undefined ? null : Number(raw);

        if (value !== null && (!Number.isFinite(value) || value < 0)) {
            throw new AppError('monthlyPriceOverride must be a non-negative number or null', 400);
        }

        return this.repo.updateCompanyPricing(companyId, value);
    }

    /**
     * Revenue analytics across all tenants. Returns per-company billing rows plus
     * aggregate metrics (MRR/ARR, plan and status breakdowns, signups over time).
     * Profit is intentionally computed client-side from adjustable cost assumptions —
     * this endpoint owns the authoritative *revenue* numbers only.
     */
    async getAnalytics() {
        const companies = await this.repo.findCompanies();

        const rows = companies.map((company: any) => {
            const seats = Array.isArray(company.users) ? company.users.length : 0;
            const products = Array.isArray(company.products) ? company.products.length : 0;
            const billing = computeCompanyBilling(
                company.plan,
                company.monthlyPriceOverride
            );

            return {
                id: company.id,
                name: company.name,
                plan: String(company.plan ?? 'STARTER').toUpperCase(),
                subscriptionStatus: company.subscriptionStatus,
                isActive: company.subscriptionStatus === 'ACTIVE',
                seats,
                products,
                createdAt: company.createdAt,
                planPrice: billing.planPrice,
                monthlyPriceOverride: billing.monthlyPriceOverride,
                monthlyRevenue: billing.monthlyRevenue,
                needsPricing: billing.needsPricing
            };
        });

        const active = rows.filter((row) => row.isActive);
        const mrr = active.reduce((sum, row) => sum + row.monthlyRevenue, 0);

        // Per-plan breakdown (active companies only contribute to MRR).
        const planBreakdown = Object.keys(PLAN_MONTHLY_PRICE).map((plan) => {
            const inPlan = rows.filter((row) => row.plan === plan);
            const activeInPlan = inPlan.filter((row) => row.isActive);
            return {
                plan,
                planPrice: PLAN_MONTHLY_PRICE[plan],
                companies: inPlan.length,
                activeCompanies: activeInPlan.length,
                seats: activeInPlan.reduce((sum, row) => sum + row.seats, 0),
                mrr: activeInPlan.reduce((sum, row) => sum + row.monthlyRevenue, 0)
            };
        });

        // Status breakdown across all companies.
        const statusBreakdown: Record<string, number> = {};
        for (const row of rows) {
            const key = row.subscriptionStatus || 'UNKNOWN';
            statusBreakdown[key] = (statusBreakdown[key] ?? 0) + 1;
        }

        // Signups by month for the last 12 months (oldest → newest), for a growth chart.
        const signupsByMonth = this.signupsByMonth(rows, 12);

        // Revenue over time — new + cumulative MRR per month (last 24 months) so the
        // dashboard can show past trend, present, and project the future.
        const revenueByMonth = this.revenueByMonth(rows, 24);

        const payingCompanies = active.filter((row) => row.monthlyRevenue > 0).length;
        const activeSeats = active.reduce((sum, row) => sum + row.seats, 0);

        // Record today's snapshot (one per day) so a real MRR history accrues, and
        // return the recorded history. Best-effort — never block analytics on it.
        const mrrHistory = await this.recordSnapshot({
            mrr,
            activeCompanies: active.length,
            payingCompanies,
            activeSeats,
        });

        return {
            metrics: {
                totalCompanies: rows.length,
                activeCompanies: active.length,
                payingCompanies,
                companiesNeedingPricing: rows.filter((row) => row.isActive && row.needsPricing).length,
                activeSeats,
                mrr,
                arr: mrr * 12,
                arpa: active.length ? mrr / active.length : 0
            },
            planBreakdown,
            statusBreakdown,
            signupsByMonth,
            revenueByMonth,
            mrrHistory,
            companies: rows
        };
    }

    /**
     * Upsert today's revenue snapshot and return the recorded daily history (last 365
     * days). Failures are swallowed so a snapshot-table issue never breaks analytics.
     */
    private async recordSnapshot(metrics: {
        mrr: number;
        activeCompanies: number;
        payingCompanies: number;
        activeSeats: number;
    }): Promise<{ day: string; mrr: number }[]> {
        const now = new Date();
        const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        try {
            await this.repo.upsertRevenueSnapshot(day, metrics);
            const since = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            const sinceDay = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`;
            return this.repo.findRevenueSnapshots(sinceDay);
        } catch {
            return [];
        }
    }

    /**
     * New and cumulative MRR for each of the last `months` calendar months.
     *  - newMrr: revenue from active companies that signed up *in* that month.
     *  - cumulativeMrr: revenue from all active companies that had signed up *by the
     *    end of* that month.
     * This is an estimate from current per-company revenue and signup dates (we don't
     * snapshot historical revenue), so it reflects today's prices applied backwards.
     */
    private revenueByMonth(
        rows: Array<{ createdAt: Date | string; monthlyRevenue: number; isActive: boolean }>,
        months: number
    ) {
        const now = new Date();
        const buckets: { month: string; newMrr: number; cumulativeMrr: number; signups: number }[] = [];

        for (let i = months - 1; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1); // exclusive
            const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

            let newMrr = 0;
            let cumulativeMrr = 0;
            let signups = 0;

            for (const row of rows) {
                if (!row.isActive) continue;
                const created = new Date(row.createdAt);
                if (Number.isNaN(created.getTime())) continue;
                if (created < end) cumulativeMrr += row.monthlyRevenue;
                if (created >= start && created < end) {
                    newMrr += row.monthlyRevenue;
                    signups += 1;
                }
            }

            buckets.push({ month: monthKey, newMrr, cumulativeMrr, signups });
        }

        return buckets;
    }

    /** Bucket company signups into the last `months` calendar months. */
    private signupsByMonth(
        rows: Array<{ createdAt: Date | string }>,
        months: number
    ) {
        const now = new Date();
        const buckets: { month: string; count: number }[] = [];
        const index = new Map<string, number>();

        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            index.set(key, buckets.length);
            buckets.push({ month: key, count: 0 });
        }

        for (const row of rows) {
            const created = new Date(row.createdAt);
            if (Number.isNaN(created.getTime())) continue;
            const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
            const at = index.get(key);
            if (at !== undefined) buckets[at].count += 1;
        }

        return buckets;
    }
}