-- CreateTable
CREATE TABLE "TruckStockMovement" (
    "id" TEXT NOT NULL,
    "truckStockItemId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousQuantity" INTEGER NOT NULL,
    "newQuantity" INTEGER NOT NULL,
    "changedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TruckStockMovement_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TruckStockMovement" ADD CONSTRAINT "TruckStockMovement_truckStockItemId_fkey" FOREIGN KEY ("truckStockItemId") REFERENCES "TruckStockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckStockMovement" ADD CONSTRAINT "TruckStockMovement_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
