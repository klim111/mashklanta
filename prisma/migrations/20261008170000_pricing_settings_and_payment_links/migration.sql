-- מחירים ומסלולים שהיועץ עורך, וקישורי תשלום חד־פעמיים לשירותי ייעוץ.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
CREATE TABLE IF NOT EXISTS "PricingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "configJson" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PaymentLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amountAgorot" INTEGER NOT NULL,
    "trackId" TEXT,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "paidAt" TIMESTAMP(3),
    "providerTransactionId" TEXT,
    "invoiceNumber" TEXT,
    "cardLast4" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLink_token_key" ON "PaymentLink"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentLink_providerTransactionId_key" ON "PaymentLink"("providerTransactionId");
CREATE INDEX IF NOT EXISTS "PaymentLink_createdById_createdAt_idx" ON "PaymentLink"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentLink_status_idx" ON "PaymentLink"("status");

-- תשלום דרך קישור תשלום יכול להגיע ממי שאין לו חשבון
ALTER TABLE "PaymentCheckout" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "PaymentCheckout" ADD COLUMN IF NOT EXISTS "paymentLinkId" TEXT;
CREATE INDEX IF NOT EXISTS "PaymentCheckout_paymentLinkId_idx" ON "PaymentCheckout"("paymentLinkId");

DO $$ BEGIN
    ALTER TABLE "PaymentCheckout" ADD CONSTRAINT "PaymentCheckout_paymentLinkId_fkey" FOREIGN KEY ("paymentLinkId") REFERENCES "PaymentLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
