-- CreateTable
CREATE TABLE "RevenueSnapshot" (
    "day" TEXT NOT NULL,
    "mrr" DOUBLE PRECISION NOT NULL,
    "activeCompanies" INTEGER NOT NULL,
    "payingCompanies" INTEGER NOT NULL,
    "activeSeats" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueSnapshot_pkey" PRIMARY KEY ("day")
);
