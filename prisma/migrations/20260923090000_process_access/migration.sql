-- גישה לתהליך משכנתא: כל תשלום נקשר לתהליך שהוא פותח, ל-35 יום

-- AlterTable
ALTER TABLE "PlatformPayment" ADD COLUMN "planId" TEXT;

-- CreateIndex
CREATE INDEX "PlatformPayment_planId_idx" ON "PlatformPayment"("planId");

-- AddForeignKey
ALTER TABLE "PlatformPayment" ADD CONSTRAINT "PlatformPayment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MortgagePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
