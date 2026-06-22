-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'PRO',
    "seats" INTEGER NOT NULL DEFAULT 1,
    "amount" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "description" TEXT,
    "setupFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "setupLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "stripeCustomerId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "checkoutUrl" TEXT,
    "activationCode" TEXT,
    "activationCodeId" TEXT,
    "companyId" TEXT,
    "paidAt" TIMESTAMP(3),
    "codeEmailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);
