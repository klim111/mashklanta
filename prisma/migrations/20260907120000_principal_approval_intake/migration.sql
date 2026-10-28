-- CreateTable
CREATE TABLE "public"."MortgageCase" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "advisorId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'אישור עקרוני',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortgageCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CaseEntity" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CaseField" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT,
    "valueEnc" TEXT,
    "source" TEXT NOT NULL DEFAULT 'client',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FieldConflict" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "profileValue" TEXT,
    "caseValue" TEXT,
    "encrypted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedValue" TEXT,
    "resolvedWith" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApprovalAccess" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApprovalAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BankBranch" (
    "id" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankBranch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MortgageCase_clientId_idx" ON "public"."MortgageCase"("clientId");

-- CreateIndex
CREATE INDEX "MortgageCase_advisorId_idx" ON "public"."MortgageCase"("advisorId");

-- CreateIndex
CREATE INDEX "CaseEntity_caseId_type_idx" ON "public"."CaseEntity"("caseId", "type");

-- CreateIndex
CREATE INDEX "CaseEntity_parentId_idx" ON "public"."CaseEntity"("parentId");

-- CreateIndex
CREATE INDEX "CaseField_caseId_idx" ON "public"."CaseField"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseField_caseId_entityType_entityId_fieldKey_key" ON "public"."CaseField"("caseId", "entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "FieldConflict_caseId_status_idx" ON "public"."FieldConflict"("caseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FieldConflict_caseId_entityType_entityId_fieldKey_key" ON "public"."FieldConflict"("caseId", "entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "ApprovalAccess_advisorId_idx" ON "public"."ApprovalAccess"("advisorId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalAccess_caseId_advisorId_key" ON "public"."ApprovalAccess"("caseId", "advisorId");

-- CreateIndex
CREATE INDEX "BankBranch_bankCode_idx" ON "public"."BankBranch"("bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "BankBranch_bankCode_branchCode_key" ON "public"."BankBranch"("bankCode", "branchCode");

-- AddForeignKey
ALTER TABLE "public"."MortgageCase" ADD CONSTRAINT "MortgageCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MortgageCase" ADD CONSTRAINT "MortgageCase_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaseEntity" ADD CONSTRAINT "CaseEntity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."MortgageCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CaseField" ADD CONSTRAINT "CaseField_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."MortgageCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FieldConflict" ADD CONSTRAINT "FieldConflict_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."MortgageCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalAccess" ADD CONSTRAINT "ApprovalAccess_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."MortgageCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApprovalAccess" ADD CONSTRAINT "ApprovalAccess_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

