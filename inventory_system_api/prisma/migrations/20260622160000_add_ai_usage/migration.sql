-- CreateTable
CREATE TABLE "AiUsage" (
    "companyId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("companyId","period")
);
