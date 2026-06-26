import { prisma } from '../../lib/prisma';

export class TruckStockRepository {
    createTruck(data: {
        truckNumber: string;
        plateNumber?: string | null;
        status?: string;
        technicianId?: string | null;
        companyId: string;
    }) {
        return prisma.truck.create({
            data: {
                truckNumber: data.truckNumber,
                plateNumber: data.plateNumber,
                status: data.status || 'ACTIVE',
                technicianId: data.technicianId,
                companyId: data.companyId,
            },
        });
    }

    findTrucks(companyId: string) {
        return prisma.truck.findMany({
            where: { companyId },
            include: {
                technician: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    findTruckByTechnicianId(technicianId: string, companyId: string) {
        return prisma.truck.findFirst({
            where: {
                technicianId,
                companyId,
                status: 'ACTIVE',
            },
        });
    }

    async updateTruck(
        truckId: string,
        companyId: string,
        data: {
            truckNumber?: string;
            plateNumber?: string | null;
            status?: string;
            technicianId?: string | null;
        }
    ) {
        await prisma.truck.updateMany({
            where: {
                id: truckId,
                companyId,
            },
            data,
        });

        return prisma.truck.findFirst({
            where: {
                id: truckId,
                companyId,
            },
            include: {
                technician: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    createTemplate(data: {
        name: string;
        tradeType?: string;
        allowance?: number | null;
        companyId: string;
        createdById: string;
    }) {
        return prisma.truckStockTemplate.create({
            data,
        });
    }

    createTemplateItem(data: {
        templateId: string;
        productName: string;
        category?: string;
        requiredQuantity: number;
        minimumQuantity: number;
        expectedPrice?: number;
        unit?: string;
        notes?: string;
    }) {
        return prisma.truckStockItem.create({
            data,
        });
    }

    findTemplates(companyId: string) {
        return prisma.truckStockTemplate.findMany({
            where: { companyId },
            include: {
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    findTemplateById(templateId: string, companyId: string) {
        return prisma.truckStockTemplate.findFirst({
            where: {
                id: templateId,
                companyId,
            },
            include: {
                items: true,
            },
        });
    }

    async updateTemplate(
        templateId: string,
        companyId: string,
        data: {
            name?: string;
            tradeType?: string | null;
            allowance?: number | null;
        }
    ) {
        await prisma.truckStockTemplate.updateMany({
            where: {
                id: templateId,
                companyId,
            },
            data,
        });

        return this.findTemplateById(templateId, companyId);
    }

    /**
     * Reconcile a template's items against the supplied list. Existing items are
     * matched by product name and updated in place — preserving their id,
     * current quantity, and movement history. New names are created; names no
     * longer present are removed (their movement history is removed first, since
     * TruckStockMovement references the item with a RESTRICT foreign key).
     */
    async replaceTemplateItems(
        templateId: string,
        items: Array<{
            productName: string;
            category?: string;
            requiredQuantity: number;
            minimumQuantity: number;
            expectedPrice?: number;
            unit?: string;
            notes?: string;
        }>
    ) {
        const norm = (s: string) => s.trim().toLowerCase();

        return prisma.$transaction(async (tx) => {
            const existing = await tx.truckStockItem.findMany({ where: { templateId } });

            // De-dupe the incoming list by product name (last one wins).
            const incoming = new Map<string, (typeof items)[number]>();
            for (const it of items) incoming.set(norm(it.productName), it);

            const keptIds = new Set<string>();

            // Update items that still exist (matched by name); leave currentQuantity untouched.
            for (const ex of existing) {
                const match = incoming.get(norm(ex.productName));
                if (!match) continue;
                keptIds.add(ex.id);
                incoming.delete(norm(ex.productName));
                await tx.truckStockItem.update({
                    where: { id: ex.id },
                    data: {
                        productName: match.productName,
                        category: match.category,
                        requiredQuantity: match.requiredQuantity,
                        minimumQuantity: match.minimumQuantity,
                        expectedPrice: match.expectedPrice,
                        unit: match.unit,
                        notes: match.notes,
                    },
                });
            }

            // Create the brand-new items.
            for (const item of incoming.values()) {
                await tx.truckStockItem.create({
                    data: {
                        templateId,
                        productName: item.productName,
                        category: item.category,
                        requiredQuantity: item.requiredQuantity,
                        minimumQuantity: item.minimumQuantity,
                        expectedPrice: item.expectedPrice,
                        unit: item.unit,
                        notes: item.notes,
                    },
                });
            }

            // Remove items dropped from the template — clear their movements first
            // to satisfy the RESTRICT foreign key.
            const removedIds = existing.filter((ex) => !keptIds.has(ex.id)).map((ex) => ex.id);
            if (removedIds.length > 0) {
                await tx.truckStockMovement.deleteMany({
                    where: { truckStockItemId: { in: removedIds } },
                });
                await tx.truckStockItem.deleteMany({ where: { id: { in: removedIds } } });
            }

            return tx.truckStockItem.findMany({ where: { templateId } });
        });
    }

    async deleteTemplate(templateId: string, companyId: string) {
        return prisma.$transaction(async (tx) => {
            const template = await tx.truckStockTemplate.findFirst({
                where: {
                    id: templateId,
                    companyId,
                },
            });

            if (!template) {
                return null;
            }

            await tx.truckStockAssignment.deleteMany({
                where: {
                    templateId,
                },
            });

            // Movements reference items with a RESTRICT FK — clear them first.
            await tx.truckStockMovement.deleteMany({
                where: { truckStockItem: { templateId } },
            });

            await tx.truckStockItem.deleteMany({
                where: {
                    templateId,
                },
            });

            return tx.truckStockTemplate.delete({
                where: {
                    id: templateId,
                },
            });
        });
    }

    findAssignmentByTruckAndTemplate(
        truckId: string,
        templateId: string
    ) {
        return prisma.truckStockAssignment.findFirst({
            where: {
                truckId,
                templateId,
            },
        });
    }

    createAssignment(data: {
        truckId: string;
        templateId: string;
        assignedById: string;
    }) {
        return prisma.truckStockAssignment.create({
            data,
            include: {
                truck: true,
                template: {
                    include: {
                        items: true
                    }
                }
            }
        });
    }

    async updateAssignment(
        assignmentId: string,
        companyId: string,
        data: {
            truckId?: string;
            templateId?: string;
        }
    ) {
        const assignment = await prisma.truckStockAssignment.findFirst({
            where: {
                id: assignmentId,
                truck: {
                    companyId,
                },
            },
        });

        if (!assignment) {
            return null;
        }

        return prisma.truckStockAssignment.update({
            where: {
                id: assignmentId,
            },
            data,
            include: {
                truck: true,
                template: true,
                assignedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    async deleteAssignment(
        assignmentId: string,
        companyId: string
    ) {
        const assignment = await prisma.truckStockAssignment.findFirst({
            where: {
                id: assignmentId,
                truck: {
                    companyId,
                },
            },
        });

        if (!assignment) {
            return null;
        }

        return prisma.truckStockAssignment.delete({
            where: {
                id: assignmentId,
            },
        });
    }

    findAssignments(companyId: string) {
        return prisma.truckStockAssignment.findMany({
            where: {
                truck: {
                    companyId,
                },
            },
            include: {
                truck: true,
                template: true,
                assignedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    findAssignedStockForTechnician(companyId: string, technicianId: string) {
        return prisma.truck.findFirst({
            where: {
                companyId,
                technicianId
            },
            include: {
                stockAssignments: {
                    include: {
                        template: {
                            include: {
                                items: true
                            }
                        }
                    }
                }
            }
        });
    }

    findLowStockItems(companyId: string) {
        return prisma.truckStockTemplate.findMany({
            where: {
                companyId,
                items: {
                    some: {
                        currentQuantity: {
                            lte: prisma.truckStockItem.fields.minimumQuantity,
                        },
                    },
                },
            },
            include: {
                items: {
                    where: {
                        currentQuantity: {
                            lte: prisma.truckStockItem.fields.minimumQuantity,
                        },
                    },
                },
                assignments: {
                    include: {
                        truck: true,
                    },
                },
            },
        });
    }

    updateTruckStockItemQuantity(
        itemId: string,
        quantity: number
    ) {
        return prisma.truckStockItem.update({
            where: { id: itemId },
            data: {
                currentQuantity: quantity,
            },
        });
    }

    findTruckStockItemById(itemId: string) {
        return prisma.truckStockItem.findUnique({
            where: { id: itemId },
            include: {
                template: true,
            },
        });
    }

    createMovement(data: {
        truckStockItemId: string;
        action: string;
        previousQuantity: number;
        newQuantity: number;
        changedById: string;
        notes?: string;
    }) {
        return prisma.truckStockMovement.create({
            data,
        });
    }

    findMovements(companyId: string) {
        return prisma.truckStockMovement.findMany({
            where: {
                truckStockItem: {
                    template: {
                        companyId,
                    },
                },
            },
            include: {
                truckStockItem: true,
                changedBy: {
                    select: {
                        id: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    getInventoryByProductId(productId: string, companyId: string) {
        return prisma.inventory.findFirst({
            where: {
                productId,
                companyId,
            },
        });
    }

    decreaseWarehouseInventory(inventoryId: string, quantity: number) {
        return prisma.inventory.update({
            where: { id: inventoryId },
            data: {
                quantity: {
                    decrement: quantity,
                },
            },
        });
    }

    increaseTruckStockItemQuantity(itemId: string, quantity: number) {
        return prisma.truckStockItem.update({
            where: { id: itemId },
            data: {
                currentQuantity: {
                    increment: quantity,
                },
            },
        });
    }

    decreaseTruckStockItemQuantity(itemId: string, quantity: number) {
        return prisma.truckStockItem.update({
            where: { id: itemId },
            data: {
                currentQuantity: {
                    decrement: quantity,
                },
            },
        });
    }

    createReceipt(data: {
        companyId: string;
        technicianId: string;
        truckId: string;
        fileUrl: string;
        totalAmount?: number;
    }) {
        return prisma.purchaseReceipt.create({
            data,
        });
    }

    findReceipts(companyId: string) {
        return prisma.purchaseReceipt.findMany({
            where: { companyId },
            include: {
                technician: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                truck: true,
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /** Receipts uploaded by a single technician (their own spending history). */
    findReceiptsByTechnician(companyId: string, technicianId: string) {
        return prisma.purchaseReceipt.findMany({
            where: { companyId, technicianId },
            include: {
                technician: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                truck: true,
                items: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    findReceiptById(receiptId: string) {
        return prisma.purchaseReceipt.findUnique({
            where: { id: receiptId },
        });
    }

    createReceiptItem(data: {
        receiptId: string;
        itemName: string;
        quantity: number;
        unitPrice?: number;
        totalPrice?: number;
    }) {
        return prisma.receiptItem.create({
            data,
        });
    }

    findReceiptWithItems(receiptId: string) {
        return prisma.purchaseReceipt.findUnique({
            where: { id: receiptId },
            include: {
                items: true,
                truck: {
                    include: {
                        stockAssignments: {
                            include: {
                                template: {
                                    include: {
                                        items: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    updateReceiptStatus(receiptId: string, status: string) {
        return prisma.purchaseReceipt.update({
            where: { id: receiptId },
            data: { status },
        });
    }

    findTechnicianById(userId: string, companyId: string) {
        return prisma.user.findFirst({
            where: {
                id: userId,
                companyId,
                role: {
                    name: {
                        in: ['TECHNICIAN', 'ADMIN'],
                    },
                },
            },
        });
    }


}