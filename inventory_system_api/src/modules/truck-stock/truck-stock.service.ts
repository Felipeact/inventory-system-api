import path from 'path';
import { AppError } from '../../core/app-error';
import { AuditService } from '../../audit/audit.service';
import { TruckStockRepository } from './truck-stock.repository';
import { putObject } from '../../lib/storage';
import { ReceiptExtractionService } from '../ai/receipt-extraction.service';

/** Map of allowed receipt file extensions to their MIME types. */
const RECEIPT_CONTENT_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.bmp': 'image/bmp',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.csv': 'text/csv'
};

/** Parse an allowance value from a DTO into a non-negative number, or null. */
function parseAllowance(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

export class TruckStockService {
    private repo = new TruckStockRepository();
    private audit = new AuditService();
    private extractor = new ReceiptExtractionService();

    async createTruck(dto: any, companyId: string, userId?: string) {
        const { truckNumber, plateNumber, status } = dto;

        if (!truckNumber || String(truckNumber).trim() === '') {
            throw new AppError('truckNumber is required', 400);
        }

        let technicianId =
            dto.technicianId && String(dto.technicianId).trim() !== ''
                ? String(dto.technicianId).trim()
                : null;

        if (technicianId) {
            const technician = await this.repo.findTechnicianById(
                technicianId,
                companyId
            );

            if (!technician) {
                throw new AppError('Technician not found in this company', 404);
            }

            const existingTruck = await this.repo.findTruckByTechnicianId(
                technicianId,
                companyId
            );

            if (existingTruck) {
                throw new AppError(
                    'This technician is already assigned to an active truck',
                    400
                );
            }
        }

        const truck = await this.repo.createTruck({
            truckNumber: String(truckNumber).trim(),
            plateNumber: plateNumber ? String(plateNumber).trim() : null,
            status: status || 'ACTIVE',
            technicianId,
            companyId,
        });

        return truck;
    }

    getTrucks(companyId: string) {
        return this.repo.findTrucks(companyId);
    }

    async createTemplate(dto: any, companyId: string, userId: string) {
        const { name, tradeType, items, allowance } = dto;

        if (!name) {
            throw new AppError('Template name is required', 400);
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new AppError('Template items are required', 400);
        }

        const template = await this.repo.createTemplate({
            name: name.trim(),
            tradeType: tradeType?.trim(),
            allowance: parseAllowance(allowance),
            companyId,
            createdById: userId,
        });

        for (const item of items) {
            if (!item.productName || !item.requiredQuantity) {
                throw new AppError('Each item needs productName and requiredQuantity', 400);
            }

            await this.repo.createTemplateItem({
                templateId: template.id,
                productName: item.productName.trim(),
                category: item.category?.trim(),
                requiredQuantity: Number(item.requiredQuantity),
                minimumQuantity: Number(item.minimumQuantity ?? 1),
                expectedPrice: item.expectedPrice ? Number(item.expectedPrice) : undefined,
                unit: item.unit?.trim(),
                notes: item.notes?.trim(),
            });
        }

        await this.audit.log(
            'CREATE_TRUCK_STOCK_TEMPLATE',
            userId,
            companyId,
            `Created truck stock template ${template.name}`
        );

        return template;
    }

    async updateTruck(truckId: string, dto: any, companyId: string) {
        const { truckNumber, plateNumber, status } = dto;

        const updateData: {
            truckNumber?: string;
            plateNumber?: string | null;
            status?: string;
            technicianId?: string | null;
        } = {};

        if (truckNumber !== undefined) {
            updateData.truckNumber = String(truckNumber).trim();
        }

        if (plateNumber !== undefined) {
            updateData.plateNumber =
                String(plateNumber).trim() === ''
                    ? null
                    : String(plateNumber).trim();
        }

        if (status !== undefined) {
            updateData.status = String(status).toUpperCase();
        }

        if (dto.technicianId !== undefined) {
            const technicianId =
                String(dto.technicianId).trim() === ''
                    ? null
                    : String(dto.technicianId).trim();

            if (technicianId) {
                const technician = await this.repo.findTechnicianById(
                    technicianId,
                    companyId
                );

                if (!technician) {
                    throw new AppError('Technician not found in this company', 404);
                }

                const existingTruck = await this.repo.findTruckByTechnicianId(
                    technicianId,
                    companyId
                );

                if (existingTruck && existingTruck.id !== truckId) {
                    throw new AppError(
                        'This technician is already assigned to another active truck',
                        400
                    );
                }
            }

            updateData.technicianId = technicianId;
        }

        return this.repo.updateTruck(truckId, companyId, updateData);
    }

    getTemplates(companyId: string) {
        return this.repo.findTemplates(companyId);
    }

    getTemplateById(templateId: string, companyId: string) {
        return this.repo.findTemplateById(templateId, companyId);
    }

    async updateTemplate(templateId: string, dto: any, companyId: string) {
        const { name, tradeType, items, allowance } = dto;

        const existingTemplate = await this.repo.findTemplateById(
            templateId,
            companyId
        );

        if (!existingTemplate) {
            throw new AppError('Template not found', 404);
        }

        const updatedTemplate = await this.repo.updateTemplate(
            templateId,
            companyId,
            {
                name: name !== undefined ? String(name).trim() : undefined,
                tradeType: tradeType !== undefined ? String(tradeType).trim() : undefined,
                allowance: allowance !== undefined ? parseAllowance(allowance) : undefined,
            }
        );

        if (Array.isArray(items)) {
            if (items.length === 0) {
                throw new AppError('Template must have at least one item', 400);
            }

            await this.repo.replaceTemplateItems(
                templateId,
                items.map((item: any) => ({
                    productName: String(item.productName).trim(),
                    category: item.category ? String(item.category).trim() : undefined,
                    requiredQuantity: Number(item.requiredQuantity),
                    minimumQuantity: Number(item.minimumQuantity ?? 1),
                    expectedPrice:
                        item.expectedPrice !== undefined && item.expectedPrice !== null
                            ? Number(item.expectedPrice)
                            : undefined,
                    unit: item.unit ? String(item.unit).trim() : undefined,
                    notes: item.notes ? String(item.notes).trim() : undefined,
                }))
            );
        }

        return this.repo.findTemplateById(templateId, companyId);
    }

    async deleteTemplate(templateId: string, companyId: string) {
        const existingTemplate = await this.repo.findTemplateById(
            templateId,
            companyId
        );

        if (!existingTemplate) {
            throw new AppError('Template not found', 404);
        }

        return this.repo.deleteTemplate(templateId, companyId);
    }

    async assignTemplate(dto: any, companyId: string, userId: string) {
        const { truckId, templateId } = dto;

        if (!truckId || !templateId) {
            throw new AppError('truckId and templateId are required', 400);
        }

        const existingAssignment =
            await this.repo.findAssignmentByTruckAndTemplate(
                String(truckId),
                String(templateId)
            );

        if (existingAssignment) {
            throw new AppError(
                'This truck already has this template assigned',
                409
            );
        }

        const assignment = await this.repo.createAssignment({
            truckId,
            templateId,
            assignedById: userId
        });

        await this.audit.log(
            'ASSIGN_TRUCK_STOCK_TEMPLATE',
            userId,
            companyId,
            `Assigned template ${templateId} to truck ${truckId}`
        );

        return assignment;
    }

    getAssignments(companyId: string) {
        return this.repo.findAssignments(companyId);
    }

    async updateAssignment(
        assignmentId: string,
        dto: any,
        companyId: string,
        userId: string
    ) {
        const { truckId, templateId } = dto;

        if (!assignmentId) {
            throw new AppError('assignmentId is required', 400);
        }

        if (!truckId || !templateId) {
            throw new AppError('truckId and templateId are required', 400);
        }

        const existingAssignment =
            await this.repo.findAssignmentByTruckAndTemplate(
                String(truckId),
                String(templateId)
            );

        if (existingAssignment && existingAssignment.id !== assignmentId) {
            throw new AppError(
                'This truck already has this template assigned',
                409
            );
        }

        const updated =
            await this.repo.updateAssignment(
                assignmentId,
                companyId,
                {
                    truckId: String(truckId),
                    templateId: String(templateId),
                }
            );

        if (!updated) {
            throw new AppError('Assignment not found', 404);
        }

        await this.audit.log(
            'UPDATE_TRUCK_STOCK_ASSIGNMENT',
            userId,
            companyId,
            `Updated assignment ${assignmentId}`
        );

        return updated;
    }

    async deleteAssignment(
        assignmentId: string,
        companyId: string,
        userId: string
    ) {
        if (!assignmentId) {
            throw new AppError('assignmentId is required', 400);
        }

        const deleted =
            await this.repo.deleteAssignment(
                assignmentId,
                companyId
            );

        if (!deleted) {
            throw new AppError('Assignment not found', 404);
        }

        await this.audit.log(
            'DELETE_TRUCK_STOCK_ASSIGNMENT',
            userId,
            companyId,
            `Deleted assignment ${assignmentId}`
        );

        return {
            message: 'Assignment deleted'
        };
    }

    async getMyTruckStock(companyId: string, technicianId: string) {
        const truck = await this.repo.findAssignedStockForTechnician(
            companyId,
            technicianId
        );

        // A technician with no assigned truck (or a truck with no template yet) is a
        // normal empty state — not an error. Return a valid, empty payload so every
        // client renders a clean "no stock" view instead of failing on a 404.
        if (!truck) {
            return {
                id: null,
                truckId: null,
                truckNumber: null,
                plateNumber: null,
                stockAssignments: [],
                items: []
            };
        }

        // Flatten every assigned template's line items into a single top-level
        // `items` array. The desktop app reads the nested `stockAssignments`; the
        // web and mobile apps read this flattened list. Returning both keeps the
        // response self-consistent so all three clients show the same data.
        const items = (truck.stockAssignments ?? []).flatMap((assignment: any) =>
            (assignment.template?.items ?? []).map((item: any) => ({
                ...item,
                templateId: assignment.template?.id ?? item.templateId,
                templateName: assignment.template?.name ?? null,
                status:
                    item.currentQuantity <= item.minimumQuantity
                        ? 'Low Stock'
                        : 'OK'
            }))
        );

        return {
            ...truck,
            truckId: truck.id,
            items
        };
    }

    getLowStockItems(companyId: string) {
        return this.repo.findLowStockItems(companyId);
    }

    async updateItemQuantity(
        itemId: string,
        dto: any,
        companyId: string,
        userId: string
    ) {
        const { quantity } = dto;

        if (!itemId) {
            throw new AppError('itemId is required', 400);
        }

        const parsedQuantity = Number(quantity);

        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            throw new AppError('quantity must be 0 or greater', 400);
        }

        const item = await this.repo.findTruckStockItemById(itemId);

        if (!item || item.template.companyId !== companyId) {
            throw new AppError('Truck stock item not found', 404);
        }

        const previousQuantity = item.currentQuantity;

        const updated = await this.repo.updateTruckStockItemQuantity(
            itemId,
            parsedQuantity
        );

        await this.repo.createMovement({
            truckStockItemId: itemId,
            action: 'MANUAL_ADJUSTMENT',
            previousQuantity,
            newQuantity: parsedQuantity,
            changedById: userId,
            notes: `Quantity changed from ${previousQuantity} to ${parsedQuantity}`,
        });

        await this.audit.log(
            'UPDATE_TRUCK_STOCK_ITEM_QUANTITY',
            userId,
            companyId,
            `Updated truck stock item ${item.productName} quantity to ${parsedQuantity}`
        );

        return updated;
    }

    getMovements(companyId: string) {
        return this.repo.findMovements(companyId);
    }

    async transferToTruck(dto: any, companyId: string, userId: string) {
        const { productId, truckStockItemId, quantity } = dto;

        if (!productId || !truckStockItemId || !quantity) {
            throw new AppError(
                'productId, truckStockItemId, and quantity are required',
                400
            );
        }

        const amount = Number(quantity);

        if (isNaN(amount) || amount <= 0) {
            throw new AppError('quantity must be greater than 0', 400);
        }

        const inventory = await this.repo.getInventoryByProductId(
            productId,
            companyId
        );

        if (!inventory) {
            throw new AppError('Warehouse inventory not found', 404);
        }

        if (inventory.quantity < amount) {
            throw new AppError('Not enough warehouse stock', 422);
        }

        const truckItem = await this.repo.findTruckStockItemById(truckStockItemId);

        if (!truckItem || truckItem.template.companyId !== companyId) {
            throw new AppError('Truck stock item not found', 404);
        }

        const previousQuantity = truckItem.currentQuantity;
        const newQuantity = previousQuantity + amount;

        await this.repo.decreaseWarehouseInventory(inventory.id, amount);

        const updatedTruckItem =
            await this.repo.increaseTruckStockItemQuantity(truckStockItemId, amount);

        await this.repo.createMovement({
            truckStockItemId,
            action: 'WAREHOUSE_TRANSFER',
            previousQuantity,
            newQuantity,
            changedById: userId,
            notes: `Transferred ${amount} from warehouse product ${productId}`,
        });

        await this.audit.log(
            'TRANSFER_STOCK_TO_TRUCK',
            userId,
            companyId,
            `Transferred ${amount} from warehouse product ${productId} to truck stock item ${truckStockItemId}`
        );

        return {
            message: 'Stock transferred to truck successfully',
            truckStockItem: updatedTruckItem,
        };
    }

    async useTruckItem(dto: any, companyId: string, userId: string) {
        const { truckStockItemId, quantity, notes } = dto;

        if (!truckStockItemId || !quantity) {
            throw new AppError('truckStockItemId and quantity are required', 400);
        }

        const amount = Number(quantity);

        if (isNaN(amount) || amount <= 0) {
            throw new AppError('quantity must be greater than 0', 400);
        }

        const truckItem = await this.repo.findTruckStockItemById(truckStockItemId);

        if (!truckItem || truckItem.template.companyId !== companyId) {
            throw new AppError('Truck stock item not found', 404);
        }

        if (truckItem.currentQuantity < amount) {
            throw new AppError('Not enough truck stock', 422);
        }

        const previousQuantity = truckItem.currentQuantity;
        const newQuantity = previousQuantity - amount;

        const updatedTruckItem =
            await this.repo.decreaseTruckStockItemQuantity(truckStockItemId, amount);

        await this.repo.createMovement({
            truckStockItemId,
            action: 'TECHNICIAN_USAGE',
            previousQuantity,
            newQuantity,
            changedById: userId,
            notes: notes?.trim() || `Used ${amount} from truck stock`,
        });

        await this.audit.log(
            'USE_TRUCK_STOCK_ITEM',
            userId,
            companyId,
            `Used ${amount} of truck stock item ${truckStockItemId}`
        );

        return {
            message: 'Truck stock item used successfully',
            truckStockItem: updatedTruckItem,
        };
    }


    async uploadReceiptFile(
        dto: any,
        companyId: string,
        userId: string
    ) {
        const fileName = String(dto.fileName || '').trim();
        const fileContentBase64 = String(dto.fileContentBase64 || '').trim();

        if (!fileName || !fileContentBase64) {
            throw new AppError('fileName and fileContentBase64 are required', 400);
        }

        const allowedExtensions = new Set([
            '.png', '.jpg', '.jpeg', '.bmp', '.pdf', '.xlsx', '.xls', '.csv'
        ]);

        const extension = path.extname(fileName).toLowerCase();

        if (!allowedExtensions.has(extension)) {
            throw new AppError('Receipt file type is not allowed', 400);
        }

        const buffer = Buffer.from(fileContentBase64, 'base64');

        if (!buffer.length) {
            throw new AppError('Receipt file is empty', 400);
        }

        const maxBytes = 10 * 1024 * 1024;

        if (buffer.length > maxBytes) {
            throw new AppError('Receipt file is too large. Maximum size is 10MB', 400);
        }

        const safeBaseName = path
            .basename(fileName, extension)
            .replace(/[^a-zA-Z0-9-_]/g, '_')
            .slice(0, 80);

        const storedFileName = `${Date.now()}_${userId}_${safeBaseName}${extension}`;
        const objectKey = `receipts/${companyId}/${storedFileName}`;
        const contentType = RECEIPT_CONTENT_TYPES[extension] ?? 'application/octet-stream';

        const { url: fileUrl } = await putObject(objectKey, buffer, contentType);

        await this.audit.log(
            'UPLOAD_RECEIPT_FILE',
            userId,
            companyId,
            `Uploaded receipt file ${storedFileName}`
        );

        return {
            fileUrl,
            fileName: storedFileName,
            sizeBytes: buffer.length,
        };
    }

    /**
     * Read an uploaded receipt (PDF/image, base64) with AI and return its total
     * and line items without persisting anything — the client uses this to
     * pre-fill the upload form for the technician to confirm.
     */
    async extractReceipt(dto: any, companyId: string, userId: string) {
        const { fileBase64, fileName } = dto;

        if (!fileBase64 || !fileName) {
            throw new AppError('fileBase64 and fileName are required', 400);
        }

        const result = await this.extractor.extract(String(fileBase64), String(fileName));

        await this.audit.log(
            'EXTRACT_TRUCK_RECEIPT',
            userId,
            companyId,
            `AI-read receipt ${fileName} (${result.items.length} item(s), total ${result.total ?? 'n/a'})`
        );

        return result;
    }

    async createReceipt(dto: any, companyId: string, userId: string) {
        const { truckId, fileUrl, totalAmount, items } = dto;

        if (!truckId || !fileUrl) {
            throw new AppError('truckId and fileUrl are required', 400);
        }

        const receipt = await this.repo.createReceipt({
            companyId,
            technicianId: userId,
            truckId,
            fileUrl: fileUrl.trim(),
            totalAmount: totalAmount ? Number(totalAmount) : undefined,
        });

        // Persist any line items captured at upload (e.g. from AI extraction) so
        // reconciliation and stock booking on approval have data to work with.
        if (Array.isArray(items)) {
            for (const item of items) {
                if (!item || !item.itemName || !item.quantity) continue;
                await this.repo.createReceiptItem({
                    receiptId: receipt.id,
                    itemName: String(item.itemName).trim(),
                    quantity: Number(item.quantity),
                    unitPrice:
                        item.unitPrice !== undefined && item.unitPrice !== null
                            ? Number(item.unitPrice)
                            : undefined,
                    totalPrice:
                        item.totalPrice !== undefined && item.totalPrice !== null
                            ? Number(item.totalPrice)
                            : undefined,
                });
            }
        }

        await this.audit.log(
            'UPLOAD_TRUCK_RECEIPT',
            userId,
            companyId,
            `Uploaded receipt for truck ${truckId}`
        );

        return receipt;
    }

    getReceipts(companyId: string) {
        return this.repo.findReceipts(companyId);
    }

    /** Receipts uploaded by the signed-in technician (their own spending history). */
    getMyReceipts(companyId: string, technicianId: string) {
        return this.repo.findReceiptsByTechnician(companyId, technicianId);
    }

    async addReceiptItem(
        receiptId: string,
        dto: any,
        companyId: string,
        userId: string
    ) {
        const { itemName, quantity, unitPrice, totalPrice } = dto;

        if (!receiptId) {
            throw new AppError('receiptId is required', 400);
        }

        if (!itemName || !quantity) {
            throw new AppError('itemName and quantity are required', 400);
        }

        const receipt = await this.repo.findReceiptById(receiptId);

        if (!receipt || receipt.companyId !== companyId) {
            throw new AppError('Receipt not found', 404);
        }

        const receiptItem = await this.repo.createReceiptItem({
            receiptId,
            itemName: itemName.trim(),
            quantity: Number(quantity),
            unitPrice: unitPrice ? Number(unitPrice) : undefined,
            totalPrice: totalPrice ? Number(totalPrice) : undefined,
        });

        await this.audit.log(
            'ADD_RECEIPT_ITEM',
            userId,
            companyId,
            `Added receipt item ${itemName} to receipt ${receiptId}`
        );

        return receiptItem;
    }

    /**
     * Reconcile a receipt against the spending allowance of the truck's assigned
     * stock template(s). Each template contributes its `allowance` (or, if unset,
     * the sum of its items' `expectedPrice x requiredQuantity` as a fallback).
     * The receipt RECONCILES when its total is at or under that allowance (a
     * budget cap); a total over the allowance NEEDS_REVIEW (overspend).
     */
    async reconcileReceipt(receiptId: string, companyId: string, userId: string) {
        const receipt = await this.repo.findReceiptWithItems(receiptId);

        if (!receipt || receipt.companyId !== companyId) {
            throw new AppError('Receipt not found', 404);
        }

        const templates = receipt.truck.stockAssignments.map((a) => a.template);

        // Allowance = sum across assigned templates of the explicit allowance,
        // falling back to the priced-items total when a template has none set.
        let allowanceTotal = 0;
        let hasExpected = false;
        for (const t of templates) {
            if (t.allowance !== null && t.allowance !== undefined) {
                allowanceTotal += Number(t.allowance);
                hasExpected = true;
                continue;
            }
            let itemsTotal = 0;
            let priced = false;
            for (const item of t.items) {
                if (item.expectedPrice !== null && item.expectedPrice !== undefined) {
                    itemsTotal += Number(item.expectedPrice) * Number(item.requiredQuantity ?? 0);
                    priced = true;
                }
            }
            if (priced) {
                allowanceTotal += itemsTotal;
                hasExpected = true;
            }
        }
        allowanceTotal = Math.round(allowanceTotal * 100) / 100;

        const receiptTotal =
            receipt.totalAmount !== null && receipt.totalAmount !== undefined
                ? Number(receipt.totalAmount)
                : null;

        const difference =
            receiptTotal !== null
                ? Math.round((receiptTotal - allowanceTotal) * 100) / 100
                : null;

        // Within budget: total at or under allowance (one-cent tolerance).
        const matches =
            receiptTotal !== null && hasExpected && (difference as number) <= 0.01;

        const status = matches ? 'RECONCILED' : 'NEEDS_REVIEW';

        await this.repo.updateReceiptStatus(receiptId, status);

        await this.audit.log(
            'RECONCILE_RECEIPT',
            userId,
            companyId,
            `Reconciled receipt ${receiptId} with status ${status} ` +
                `(receipt ${receiptTotal ?? 'n/a'} vs allowance ${allowanceTotal})`
        );

        return {
            receiptId,
            status,
            receiptTotal,
            // `expectedTotal` is the allowance cap (kept name for the web client).
            expectedTotal: allowanceTotal,
            difference,
            hasExpected,
            overBudget: difference !== null && difference > 0.01,
            templateCount: templates.length,
        };
    }

    async updateReceiptStatus(
        receiptId: string,
        dto: any,
        companyId: string,
        userId: string
    ) {
        const { status } = dto;

        const allowedStatuses = ['APPROVED', 'REJECTED', 'NEEDS_REVIEW'];

        if (!allowedStatuses.includes(status)) {
            throw new AppError('Invalid receipt status', 400);
        }

        const receipt = await this.repo.findReceiptById(receiptId);

        if (!receipt || receipt.companyId !== companyId) {
            throw new AppError('Receipt not found', 404);
        }

        const updated = await this.repo.updateReceiptStatus(receiptId, status);

        // Approving a receipt for the first time books its purchased quantities
        // onto the truck's stock. Guard against re-approval so stock isn't
        // double-counted, and never let a rejected receipt touch stock.
        let stockApplied = 0;
        if (status === 'APPROVED' && receipt.status !== 'APPROVED') {
            stockApplied = await this.applyReceiptToStock(receiptId, companyId, userId);
        }

        await this.audit.log(
            'UPDATE_RECEIPT_STATUS',
            userId,
            companyId,
            `Updated receipt ${receiptId} status to ${status}` +
                (stockApplied ? ` (applied ${stockApplied} item(s) to truck stock)` : '')
        );

        return updated;
    }

    /**
     * Book an approved receipt's line items onto the truck's stock: each receipt
     * item is matched by name to a stock item on one of the truck's assigned
     * templates, and that item's current quantity is increased by the purchased
     * quantity. Returns the number of stock items updated.
     */
    private async applyReceiptToStock(
        receiptId: string,
        companyId: string,
        userId: string
    ): Promise<number> {
        const receipt = await this.repo.findReceiptWithItems(receiptId);
        if (!receipt) return 0;

        const stockItems = receipt.truck.stockAssignments.flatMap(
            (assignment) => assignment.template.items
        );

        let applied = 0;
        for (const line of receipt.items) {
            const qty = Number(line.quantity);
            if (!Number.isFinite(qty) || qty <= 0) continue;

            const match = stockItems.find(
                (s) =>
                    s.productName.toLowerCase().includes(line.itemName.toLowerCase()) ||
                    line.itemName.toLowerCase().includes(s.productName.toLowerCase())
            );
            if (!match) continue;

            const previousQuantity = match.currentQuantity;
            await this.repo.increaseTruckStockItemQuantity(match.id, qty);

            await this.repo.createMovement({
                truckStockItemId: match.id,
                action: 'RECEIPT_PURCHASE',
                previousQuantity,
                newQuantity: previousQuantity + qty,
                changedById: userId,
                notes: `Restocked +${qty} from approved receipt ${receiptId}`,
            });

            applied += 1;
        }

        if (applied > 0) {
            await this.audit.log(
                'APPLY_RECEIPT_TO_TRUCK_STOCK',
                userId,
                companyId,
                `Applied ${applied} item(s) from receipt ${receiptId} to truck stock`
            );
        }

        return applied;
    }
}