-- CreateEnum
CREATE TYPE "public"."HouseholdType" AS ENUM ('SINGLE', 'COUPLE');

-- CreateEnum
CREATE TYPE "public"."DealType" AS ENUM ('first_home', 'replacement_home', 'second_home', 'any_purpose');

-- CreateEnum
CREATE TYPE "public"."ClientStage" AS ENUM ('INTAKE', 'DOCUMENTS', 'PLANNING', 'BANK_SUBMISSION', 'APPROVAL', 'NEGOTIATION', 'SIGNING', 'FUNDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ClientDocumentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "public"."Client" DROP CONSTRAINT "Client_advisorId_fkey";

-- AlterTable
ALTER TABLE "public"."Client" DROP COLUMN "mortgageMixes",
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "dealType" "public"."DealType",
ADD COLUMN     "existingLoans" DOUBLE PRECISION,
ADD COLUMN     "household" "public"."HouseholdType" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN     "mortgageAmount" DOUBLE PRECISION,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "partnerAge" INTEGER,
ADD COLUMN     "partnerIncome" DOUBLE PRECISION,
ADD COLUMN     "partnerName" TEXT,
ADD COLUMN     "propertyAddress" TEXT,
ADD COLUMN     "stage" "public"."ClientStage" NOT NULL DEFAULT 'INTAKE',
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."ClientDocument" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "public"."ClientStage" NOT NULL,
    "status" "public"."ClientDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "submittedAt" TIMESTAMP(3),
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MortgageMix" (
    "id" TEXT NOT NULL,
    "mixKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "propertyValue" DOUBLE PRECISION,
    "propertyAddress" TEXT,
    "dealType" "public"."DealType",
    "monthlyPayment" DOUBLE PRECISION NOT NULL,
    "totalInterest" DOUBLE PRECISION NOT NULL,
    "totalPaid" DOUBLE PRECISION NOT NULL,
    "averageRate" DOUBLE PRECISION NOT NULL,
    "months" INTEGER NOT NULL,
    "mixJson" JSONB NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortgageMix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientDocument_clientId_stage_idx" ON "public"."ClientDocument"("clientId", "stage");

-- CreateIndex
CREATE UNIQUE INDEX "ClientDocument_clientId_key_key" ON "public"."ClientDocument"("clientId", "key");

-- CreateIndex
CREATE INDEX "MortgageMix_clientId_idx" ON "public"."MortgageMix"("clientId");

-- CreateIndex
CREATE INDEX "MortgageMix_ownerId_idx" ON "public"."MortgageMix"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "MortgageMix_ownerId_mixKey_key" ON "public"."MortgageMix"("ownerId", "mixKey");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "public"."Client"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_advisorId_userId_key" ON "public"."Client"("advisorId", "userId");

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MortgageMix" ADD CONSTRAINT "MortgageMix_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MortgageMix" ADD CONSTRAINT "MortgageMix_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
