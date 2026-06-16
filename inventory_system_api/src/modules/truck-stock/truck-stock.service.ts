import path from 'path';
import { AppError } from '../../core/app-error';
import { AuditService } from '../../audit/audit.service';
import { TruckStockRepository } from './truck-stock.repository';
import { putObject } from '../../lib/storage';

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

export class TruckStockService {
    private repo = new TruckStockRepository();
    private audit = new AuditService();

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
        const { name, tradeType, items } = dto;

        if (!name) {
            throw new AppError('Template name is required', 400);
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new AppError('Template items are required', 400);
        }

        const template = await this.repo.createTemplate({
            name: name.trim(),
            tradeType: tradeType?.trim(),
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
        const { name, tradeType, items } = dto;

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

        if (!truck) {
            throw new AppError('No truck assigned to this technician', 404);
        }

        return truck;
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

    async createReceipt(dto: any, companyId: string, userId: string) {
        const { truckId, fileUrl, totalAmount } = dto;

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

    async reconcileReceipt(receiptId: string, companyId: string, userId: string) {
        const receipt = await this.repo.findReceiptWithItems(receiptId);

        if (!receipt || receipt.companyId !== companyId) {
            throw new AppError('Receipt not found', 404);
        }

        const requiredItems =
            receipt.truck.stockAssignments.flatMap(
                (assignment) => assignment.template.items
            );

        const receiptItems = receipt.items;

        const matched: any[] = [];
        const missing: any[] = [];
        const extra: any[] = [];
        const priceDifferences: any[] = [];

        for (const required of requiredItems) {
            const found = receiptItems.find((item) =>
                item.itemName.toLowerCase().includes(required.productName.toLowerCase()) ||
                required.productName.toLowerCase().includes(item.itemName.toLowerCase())
            );

            if (!found) {
                missing.push({
                    requiredItemId: required.id,
                    productName: required.productName,
                    requiredQuantity: required.requiredQuantity,
                    expectedPrice: required.expectedPrice,
                });
                continue;
            }

            matched.push({
                requiredItemId: required.id,
                productName: required.productName,
                receiptItemId: found.id,
                receiptItemName: found.itemName,
                receiptQuantity: found.quantity,
                requiredQuantity: required.requiredQuantity,
            });

            if (
                required.expectedPrice !== null &&
                required.expectedPrice !== undefined &&
                found.unitPrice !== null &&
                found.unitPrice !== undefined &&
                Number(found.unitPrice) !== Number(required.expectedPrice)
            ) {
                priceDifferences.push({
                    productName: required.productName,
                    expectedPrice: required.expectedPrice,
                    actualPrice: found.unitPrice,
                    difference: Number(found.unitPrice) - Number(required.expectedPrice),
                });
            }
        }

        for (const receiptItem of receiptItems) {
            const foundRequired = requiredItems.find((required) =>
                receiptItem.itemName.toLowerCase().includes(required.productName.toLowerCase()) ||
                required.productName.toLowerCase().includes(receiptItem.itemName.toLowerCase())
            );

            if (!foundRequired) {
                extra.push({
                    receiptItemId: receiptItem.id,
                    itemName: receiptItem.itemName,
                    quantity: receiptItem.quantity,
                    unitPrice: receiptItem.unitPrice,
                    totalPrice: receiptItem.totalPrice,
                });
            }
        }

        const status =
            missing.length === 0 && extra.length === 0 && priceDifferences.length === 0
                ? 'RECONCILED'
                : 'NEEDS_REVIEW';

        await this.repo.updateReceiptStatus(receiptId, status);

        await this.audit.log(
            'RECONCILE_RECEIPT',
            userId,
            companyId,
            `Reconciled receipt ${receiptId} with status ${status}`
        );

        return {
            receiptId,
            status,
            matched,
            missing,
            extra,
            priceDifferences,
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

        await this.audit.log(
            'UPDATE_RECEIPT_STATUS',
            userId,
            companyId,
            `Updated receipt ${receiptId} status to ${status}`
        );

        return updated;
    }
}