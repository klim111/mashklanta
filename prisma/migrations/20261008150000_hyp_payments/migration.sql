-- תשלום אמיתי דרך מסוף HYP: פרטי העסקה על התשלום, ומעבר לעמוד התשלום.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "PlatformPayment" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "PlatformPayment" ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT;
ALTER TABLE "PlatformPayment" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "PlatformPayment" ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "PlatformPayment_providerTransactionId_key" ON "PlatformPayment"("providerTransactionId");

CREATE TABLE IF NOT EXISTS "PaymentCheckout" (
    "id" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "amountAgorot" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "returnPath" TEXT,
    "failureCode" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCheckout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentCheckout_orderRef_key" ON "PaymentCheckout"("orderRef");
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentCheckout_paymentId_key" ON "PaymentCheckout"("paymentId");
CREATE INDEX IF NOT EXISTS "PaymentCheckout_userId_createdAt_idx" ON "PaymentCheckout"("userId", "createdAt");

DO $$ BEGIN
    ALTER TABLE "PaymentCheckout" ADD CONSTRAINT "PaymentCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
