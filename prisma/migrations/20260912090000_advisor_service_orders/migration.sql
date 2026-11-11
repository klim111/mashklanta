-- הזמנת ליווי יועץ לשלבים בתהליך המשכנתא.
-- הלקוח בוחר אילו שלבים יועץ יבצע במקומו ומשלם עליהם; עד התשלום השלב נשאר
-- בידיו, ומרגע התשלום היועץ מקבל עליו משימה באזור שלו.

CREATE TYPE "AdvisorOrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED');

CREATE TABLE "AdvisorServiceOrder" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "advisorId" TEXT,
    "clientId" TEXT,
    "stagesJson" JSONB NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "AdvisorOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "termsAcceptedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "cardLast4" TEXT,
    "payerName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorServiceOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdvisorServiceOrder_planId_idx" ON "AdvisorServiceOrder"("planId");
CREATE INDEX "AdvisorServiceOrder_ownerId_idx" ON "AdvisorServiceOrder"("ownerId");
CREATE INDEX "AdvisorServiceOrder_advisorId_status_idx" ON "AdvisorServiceOrder"("advisorId", "status");

ALTER TABLE "AdvisorServiceOrder" ADD CONSTRAINT "AdvisorServiceOrder_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "MortgagePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorServiceOrder" ADD CONSTRAINT "AdvisorServiceOrder_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorServiceOrder" ADD CONSTRAINT "AdvisorServiceOrder_advisorId_fkey"
    FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdvisorServiceOrder" ADD CONSTRAINT "AdvisorServiceOrder_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
