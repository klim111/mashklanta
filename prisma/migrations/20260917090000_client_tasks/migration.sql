-- המשימות המתוכננות של הלקוח: מתבניות השלבים או בניסוח חופשי, ומופיעות בלוח השנה

-- CreateEnum
CREATE TYPE "ClientTaskKind" AS ENUM ('TASK', 'MEETING', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "ClientTaskStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "ClientTask" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "planId" TEXT,
    "stage" "PlanStage",
    "kind" "ClientTaskKind" NOT NULL,
    "templateKey" TEXT,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "bank" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "ClientTaskStatus" NOT NULL DEFAULT 'OPEN',
    "documentId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientTask_ownerId_status_idx" ON "ClientTask"("ownerId", "status");

-- CreateIndex
CREATE INDEX "ClientTask_planId_stage_idx" ON "ClientTask"("planId", "stage");

-- CreateIndex
CREATE INDEX "ClientTask_ownerId_dueAt_idx" ON "ClientTask"("ownerId", "dueAt");

-- AddForeignKey
ALTER TABLE "ClientTask" ADD CONSTRAINT "ClientTask_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTask" ADD CONSTRAINT "ClientTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MortgagePlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
