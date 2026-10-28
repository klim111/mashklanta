-- מסמכים תומכים שהלקוח מעלה לתהליך. הקובץ עצמו יושב ב-Vercel Blob כאובייקט
-- פרטי, וכאן נשמר רק הנתיב אליו — הוא אינו נחשף לדפדפן.
CREATE TABLE "PlanDocument" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "blobPath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanDocument_planId_key_key" ON "PlanDocument"("planId", "key");
CREATE INDEX "PlanDocument_clientId_idx" ON "PlanDocument"("clientId");
CREATE INDEX "PlanDocument_ownerId_idx" ON "PlanDocument"("ownerId");

ALTER TABLE "PlanDocument" ADD CONSTRAINT "PlanDocument_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "MortgagePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanDocument" ADD CONSTRAINT "PlanDocument_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanDocument" ADD CONSTRAINT "PlanDocument_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
