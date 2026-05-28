import { Response } from 'express';
import { BaseController } from '../../core/base.controller';
import { asyncHandler } from '../../core/async-handler';
import { AuthRequest } from '../../middleware/auth.middleware';
import { TruckStockService } from './truck-stock.service';
import { AppError } from '../../core/app-error';

export class TruckStockController extends BaseController {
    private service = new TruckStockService();

    createTruck = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.createTruck(
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.created(res, data);
    });

    getTrucks = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getTrucks(req.user!.companyId);

        return this.ok(res, data);
    });

    updateTruck = asyncHandler(async (req: AuthRequest, res: Response) => {
        const id = req.params.id;

        if (!id || typeof id !== 'string') {
            throw new AppError('Truck id is required', 400);
        }

        const data = await this.service.updateTruck(
            id,
            req.body,
            req.user!.companyId
        );

        return this.ok(res, data);
    });

    createTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.createTemplate(
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.created(res, data);
    });

    getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getTemplates(req.user!.companyId);

        return this.ok(res, data);
    });

    getTemplateById = asyncHandler(async (req: AuthRequest, res: Response) => {
        const id = req.params.id;

        if (!id || typeof id !== 'string') {
            throw new AppError('Template id is required', 400);
        }

        const data = await this.service.getTemplateById(
            id,
            req.user!.companyId
        );

        return this.ok(res, data);
    });

    updateTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
        const id = req.params.id;

        if (!id || typeof id !== 'string') {
            throw new AppError('Template id is required', 400);
        }

        const data = await this.service.updateTemplate(
            id,
            req.body,
            req.user!.companyId
        );

        return this.ok(res, data);
    });

    deleteTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
        const id = req.params.id;

        if (!id || typeof id !== 'string') {
            throw new AppError('Template id is required', 400);
        }

        await this.service.deleteTemplate(
            id,
            req.user!.companyId
        );

        return this.ok(res, {
            message: 'Template deleted'
        });
    });

    assignTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.assignTemplate(
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.created(res, data);
    });

    getAssignments = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getAssignments(req.user!.companyId);
        return this.ok(res, data);
    });

    getMyTruckStock = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getMyTruckStock(
            req.user!.companyId,
            req.user!.userId
        );

        return this.ok(res, data);
    });

    getLowStockItems = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getLowStockItems(req.user!.companyId);

        return this.ok(res, data);
    });

    updateItemQuantity = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.updateItemQuantity(
            String(req.params.itemId),
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.ok(res, data);
    });

    getMovements = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getMovements(req.user!.companyId);

        return this.ok(res, data);
    });

    transferToTruck = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.transferToTruck(
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.ok(res, data);
    });

    useTruckItem = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.useTruckItem(
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.ok(res, data);
    });

    createReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.createReceipt(
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.created(res, data);
    });

    getReceipts = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.getReceipts(req.user!.companyId);

        return this.ok(res, data);
    });

    addReceiptItem = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.addReceiptItem(
            String(req.params.receiptId),
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.created(res, data);
    });

    reconcileReceipt = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.reconcileReceipt(
            String(req.params.receiptId),
            req.user!.companyId,
            req.user!.userId
        );

        return this.ok(res, data);
    });

    updateReceiptStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
        const data = await this.service.updateReceiptStatus(
            String(req.params.receiptId),
            req.body,
            req.user!.companyId,
            req.user!.userId
        );

        return this.ok(res, data);
    });
}