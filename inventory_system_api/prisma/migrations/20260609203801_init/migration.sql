/*
  Warnings:

  - A unique constraint covering the columns `[truckId,templateId]` on the table `TruckStockAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "account" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "project" TEXT,
ADD COLUMN     "status" TEXT DEFAULT 'Active',
ADD COLUMN     "type" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TruckStockAssignment_truckId_templateId_key" ON "TruckStockAssignment"("truckId", "templateId");
