-- מסלול השירות: בקשות ליווי ליועצים, וגישה בתשלום לפלטפורמה

-- CreateEnum
CREATE TYPE "MortgageGoal" AS ENUM ('NEW_MORTGAGE', 'REFINANCE', 'ADVICE');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('SELF', 'HYBRID', 'FULL', 'GUIDANCE');

-- CreateEnum
CREATE TYPE "GuidanceStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformAccessAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "GuidanceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "goal" "MortgageGoal" NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "note" TEXT,
    "status" "GuidanceStatus" NOT NULL DEFAULT 'NEW',
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuidanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountAgorot" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "holderName" TEXT NOT NULL,
    "cardBrand" TEXT NOT NULL,
    "cardLast4" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuidanceRequest_status_createdAt_idx" ON "GuidanceRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GuidanceRequest_userId_idx" ON "GuidanceRequest"("userId");

-- CreateIndex
CREATE INDEX "GuidanceRequest_email_idx" ON "GuidanceRequest"("email");

-- CreateIndex
CREATE INDEX "PlatformPayment_userId_createdAt_idx" ON "PlatformPayment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidanceRequest" ADD CONSTRAINT "GuidanceRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformPayment" ADD CONSTRAINT "PlatformPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
