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
                    name: 'TECHNICIAN',
                },
            },
        });
    }


}