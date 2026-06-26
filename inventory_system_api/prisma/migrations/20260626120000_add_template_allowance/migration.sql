-- AlterTable: per-template spending allowance (budget) used for receipt reconciliation
ALTER TABLE "TruckStockTemplate" ADD COLUMN "allowance" DOUBLE PRECISION;
