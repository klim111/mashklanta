-- CreateEnum
CREATE TYPE "AdvisorTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('PROPOSED', 'CONFIRMED', 'DECLINED', 'CANCELLED');

-- CreateTable
CREATE TABLE "AdvisorTask" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stage" "PlanStage" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "AdvisorTaskStatus" NOT NULL DEFAULT 'OPEN',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorNote" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stage" "PlanStage" NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorMeeting" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "stage" "PlanStage",
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 45,
    "location" TEXT,
    "note" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'PROPOSED',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorRateDefault" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "amortizationType" TEXT NOT NULL,
    "trackType" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorRateDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MixCategory" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MixCategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "MortgageMix" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "AdvisorTask_advisorId_dueDate_idx" ON "AdvisorTask"("advisorId", "dueDate");
CREATE INDEX "AdvisorTask_clientId_stage_idx" ON "AdvisorTask"("clientId", "stage");
CREATE INDEX "AdvisorNote_clientId_stage_idx" ON "AdvisorNote"("clientId", "stage");
CREATE INDEX "AdvisorNote_advisorId_createdAt_idx" ON "AdvisorNote"("advisorId", "createdAt");
CREATE INDEX "AdvisorMeeting_advisorId_startsAt_idx" ON "AdvisorMeeting"("advisorId", "startsAt");
CREATE INDEX "AdvisorMeeting_clientId_startsAt_idx" ON "AdvisorMeeting"("clientId", "startsAt");
CREATE INDEX "AdvisorRateDefault_advisorId_idx" ON "AdvisorRateDefault"("advisorId");
CREATE UNIQUE INDEX "AdvisorRateDefault_advisorId_bank_amortizationType_trackType_key" ON "AdvisorRateDefault"("advisorId", "bank", "amortizationType", "trackType");
CREATE INDEX "MixCategory_advisorId_sortOrder_idx" ON "MixCategory"("advisorId", "sortOrder");
CREATE UNIQUE INDEX "MixCategory_advisorId_name_key" ON "MixCategory"("advisorId", "name");
CREATE INDEX "MortgageMix_categoryId_idx" ON "MortgageMix"("categoryId");

-- AddForeignKey
ALTER TABLE "AdvisorTask" ADD CONSTRAINT "AdvisorTask_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorTask" ADD CONSTRAINT "AdvisorTask_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorNote" ADD CONSTRAINT "AdvisorNote_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorNote" ADD CONSTRAINT "AdvisorNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorMeeting" ADD CONSTRAINT "AdvisorMeeting_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorMeeting" ADD CONSTRAINT "AdvisorMeeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorRateDefault" ADD CONSTRAINT "AdvisorRateDefault_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MixCategory" ADD CONSTRAINT "MixCategory_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MortgageMix" ADD CONSTRAINT "MortgageMix_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MixCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
