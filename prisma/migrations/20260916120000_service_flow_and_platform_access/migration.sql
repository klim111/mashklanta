-- מסלול השירות: גישה בתשלום לפלטפורמה, ופניות ליווי גם בלי טלפון (לקוח רשום)

-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformAccessAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AdvisorLead" ALTER COLUMN "phone" DROP NOT NULL;

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
CREATE INDEX "PlatformPayment_userId_createdAt_idx" ON "PlatformPayment"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlatformPayment" ADD CONSTRAINT "PlatformPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
