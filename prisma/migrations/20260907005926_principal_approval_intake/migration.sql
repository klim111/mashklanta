-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dataJson" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdvisorClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdvisorClient_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdvisorClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MortgageCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "advisorId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'אישור עקרוני',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MortgageCase_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MortgageCase_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseEntity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseEntity_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MortgageCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CaseField" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT,
    "source" TEXT NOT NULL DEFAULT 'client',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CaseField_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MortgageCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldConflict" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "profileValue" TEXT,
    "caseValue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedValue" TEXT,
    "resolvedWith" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldConflict_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MortgageCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdvisorAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    CONSTRAINT "AdvisorAccess_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "MortgageCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdvisorAccess_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankBranch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "branchCode" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "hashedPassword" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerified", "hashedPassword", "id", "image", "name", "updatedAt") SELECT "createdAt", "email", "emailVerified", "hashedPassword", "id", "image", "name", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE INDEX "AdvisorClient_clientId_idx" ON "AdvisorClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorClient_advisorId_clientId_key" ON "AdvisorClient"("advisorId", "clientId");

-- CreateIndex
CREATE INDEX "MortgageCase_clientId_idx" ON "MortgageCase"("clientId");

-- CreateIndex
CREATE INDEX "MortgageCase_advisorId_idx" ON "MortgageCase"("advisorId");

-- CreateIndex
CREATE INDEX "CaseEntity_caseId_type_idx" ON "CaseEntity"("caseId", "type");

-- CreateIndex
CREATE INDEX "CaseEntity_parentId_idx" ON "CaseEntity"("parentId");

-- CreateIndex
CREATE INDEX "CaseField_caseId_idx" ON "CaseField"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseField_caseId_entityType_entityId_fieldKey_key" ON "CaseField"("caseId", "entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "FieldConflict_caseId_status_idx" ON "FieldConflict"("caseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FieldConflict_caseId_entityType_entityId_fieldKey_key" ON "FieldConflict"("caseId", "entityType", "entityId", "fieldKey");

-- CreateIndex
CREATE INDEX "AdvisorAccess_advisorId_idx" ON "AdvisorAccess"("advisorId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorAccess_caseId_advisorId_key" ON "AdvisorAccess"("caseId", "advisorId");

-- CreateIndex
CREATE INDEX "BankBranch_bankCode_idx" ON "BankBranch"("bankCode");

-- CreateIndex
CREATE UNIQUE INDEX "BankBranch_bankCode_branchCode_key" ON "BankBranch"("bankCode", "branchCode");
