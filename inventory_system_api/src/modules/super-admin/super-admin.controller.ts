import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { asyncHandler } from '../../core/async-handler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { SuperAdminService } from './super-admin.service';

export class SuperAdminController extends BaseController {
    private service = new SuperAdminService();

    createSuperAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
        const bootstrapSecret = req.headers['x-bootstrap-secret'];
        const data = await this.service.createSuperAdmin(
            req.body,
            typeof bootstrapSecret === 'string' ? bootstrapSecret : undefined
        );
        return this.created(res, data);
    });

    createActivationCode = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.createActivationCode(req.body);
        return this.created(res, data);
    });

    listCompanies = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.listCompanies();
        return this.ok(res, data);
    });

    deactivateCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.deactivateCompany(
            req.params.id as string
        );
        return this.ok(res, data);
    });

    activateCompany = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.activateCompany(
            req.params.id as string

        );
        return this.ok(res, data);
    });

    updateCompanyPlan = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.updateCompanyPlan(req.params.id as string, req.body);
        return this.ok(res, data);
    });

    login = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.login(req.body);
        return this.ok(res, data);
    });

    listActivationCodes = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.listActivationCodes();
        return this.ok(res, data);
    });

    deactivateActivationCode = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.deactivateActivationCode(req.params.id as string);
        return this.ok(res, data);
    });

    getAnalytics = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getAnalytics();
        return this.ok(res, data);
    });

    setCompanyPricing = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.setCompanyPricing(req.params.id as string, req.body);
        return this.ok(res, data);
    });

    createQuote = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.createQuote(req.params.id as string, req.body);
        return this.created(res, data);
    });

    listQuotes = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.listQuotes(req.params.id as string);
        return this.ok(res, data);
    });

    cancelQuote = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.cancelQuote(req.params.subId as string);
        return this.ok(res, data);
    });

    // ---- Sales pipeline: prospect quotes (deals) ----------------------------
    createDeal = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.createDeal(req.body);
        return this.created(res, data);
    });

    listDeals = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.listDeals();
        return this.ok(res, data);
    });

    sendDeal = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.sendDeal(req.params.id as string);
        return this.ok(res, data);
    });

    emailDealCode = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.emailDealCode(req.params.id as string);
        return this.ok(res, data);
    });

    declineDeal = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.declineDeal(req.params.id as string);
        return this.ok(res, data);
    });

    removeDeal = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.removeDeal(req.params.id as string);
        return this.ok(res, data);
    });
}