-- CreateEnum
CREATE TYPE "public"."PlanStage" AS ENUM ('ANALYSIS', 'MIX', 'APPLICATIONS', 'AUCTION', 'SIGNING');

-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."PlanStageStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."MortgagePlan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentStage" "public"."PlanStage" NOT NULL DEFAULT 'ANALYSIS',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "propertyValue" DOUBLE PRECISION,
    "propertyAddress" TEXT,
    "mortgageAmount" DOUBLE PRECISION,
    "monthlyPayment" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortgagePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MortgagePlanStage" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stage" "public"."PlanStage" NOT NULL,
    "status" "public"."PlanStageStatus" NOT NULL DEFAULT 'PENDING',
    "dataJson" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortgagePlanStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MortgagePlan_ownerId_idx" ON "public"."MortgagePlan"("ownerId");

-- CreateIndex
CREATE INDEX "MortgagePlan_clientId_idx" ON "public"."MortgagePlan"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "MortgagePlanStage_planId_stage_key" ON "public"."MortgagePlanStage"("planId", "stage");

-- AddForeignKey
ALTER TABLE "public"."MortgagePlan" ADD CONSTRAINT "MortgagePlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MortgagePlan" ADD CONSTRAINT "MortgagePlan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MortgagePlanStage" ADD CONSTRAINT "MortgagePlanStage_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."MortgagePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
