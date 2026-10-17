-- Every statement is safe to run twice: preview builds migrate the production
-- database, and a failed deploy re-runs the migration. Only new tables.

-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteVisit" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "device" TEXT,
    "userId" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_startedAt_idx" ON "SiteVisit"("startedAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_path_startedAt_idx" ON "SiteVisit"("path", "startedAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_sessionId_idx" ON "SiteVisit"("sessionId");

-- CreateTable
CREATE TABLE IF NOT EXISTS "SignupDraft" (
    "id" TEXT NOT NULL,
    "draftKey" TEXT NOT NULL,
    "visitorId" TEXT,
    "source" TEXT NOT NULL,
    "path" TEXT,
    "name" TEXT,
    "username" TEXT,
    "email" TEXT,
    "lastField" TEXT,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignupDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SignupDraft_draftKey_key" ON "SignupDraft"("draftKey");
CREATE INDEX IF NOT EXISTS "SignupDraft_email_idx" ON "SignupDraft"("email");
CREATE INDEX IF NOT EXISTS "SignupDraft_updatedAt_idx" ON "SignupDraft"("updatedAt");
