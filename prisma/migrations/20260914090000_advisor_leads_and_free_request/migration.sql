-- בקשת ליווי חינמית שנשלחת מתוך שלב: היועץ מטפל, התשלום בהמשך.
ALTER TYPE "AdvisorOrderStatus" ADD VALUE IF NOT EXISTS 'REQUESTED';

-- פניות ליווי כלליות מהאזור האישי (מצאתי נכס / סירוב / גיוס הון וכו').
CREATE TYPE "AdvisorLeadStatus" AS ENUM ('OPEN', 'HANDLED', 'CLOSED');

CREATE TABLE "AdvisorLead" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "advisorId" TEXT,
    "clientId" TEXT,
    "topic" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "status" "AdvisorLeadStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvisorLead_advisorId_status_idx" ON "AdvisorLead"("advisorId", "status");
CREATE INDEX "AdvisorLead_ownerId_idx" ON "AdvisorLead"("ownerId");

ALTER TABLE "AdvisorLead" ADD CONSTRAINT "AdvisorLead_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvisorLead" ADD CONSTRAINT "AdvisorLead_advisorId_fkey"
    FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvisorLead" ADD CONSTRAINT "AdvisorLead_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
