-- AlterTable
ALTER TABLE "User" ADD COLUMN "profileJson" JSONB;

-- AlterTable
ALTER TABLE "MortgageMix" ADD COLUMN "planId" TEXT;
ALTER TABLE "MortgageMix" ADD COLUMN "isFinal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MortgageMix" ADD COLUMN "locked" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MortgageMix_planId_idx" ON "MortgageMix"("planId");

-- AddForeignKey
ALTER TABLE "MortgageMix" ADD CONSTRAINT "MortgageMix_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MortgagePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
