-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "stripeCustomerId" TEXT;
ALTER TABLE "Company" ADD COLUMN     "stripeSubscriptionId" TEXT;
ALTER TABLE "Company" ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3);
