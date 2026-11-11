-- רשומות התשלום של לקוח שהסיר את החשבון, ליועץ (src/lib/account-deletion.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
CREATE TABLE IF NOT EXISTS "DepartedClient" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "departedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstPaidAt" TIMESTAMP(3),
    "lastPaidAt" TIMESTAMP(3),
    "accessEndsAt" TIMESTAMP(3),
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentsJson" JSONB NOT NULL,
    CONSTRAINT "DepartedClient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DepartedClient_advisorId_departedAt_idx" ON "DepartedClient"("advisorId", "departedAt");
