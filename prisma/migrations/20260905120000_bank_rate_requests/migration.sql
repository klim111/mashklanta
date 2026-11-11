-- CreateTable
CREATE TABLE "BankRateRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "requestKey" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "mixKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "propertyAddress" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "trackCount" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "mixJson" JSONB NOT NULL,
    "detailsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankRateRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankRateRequest_ownerId_requestKey_key" ON "BankRateRequest"("ownerId", "requestKey");
CREATE INDEX "BankRateRequest_ownerId_createdAt_idx" ON "BankRateRequest"("ownerId", "createdAt");
CREATE INDEX "BankRateRequest_clientId_idx" ON "BankRateRequest"("clientId");

-- AddForeignKey
ALTER TABLE "BankRateRequest" ADD CONSTRAINT "BankRateRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankRateRequest" ADD CONSTRAINT "BankRateRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
