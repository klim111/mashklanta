-- תכנון ההון העצמי וההוצאות הנלוות של הלקוח — הפלט של כלי תכנון ההוצאות

-- CreateTable
CREATE TABLE "EquityPlan" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "propertyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetDate" TIMESTAMP(3),
    "financingProfile" TEXT NOT NULL DEFAULT 'first-home',
    "usesBroker" BOOLEAN NOT NULL DEFAULT false,
    "minEquityRequired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRequired" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expensesJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquityPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EquityPlan_ownerId_key" ON "EquityPlan"("ownerId");

-- AddForeignKey
ALTER TABLE "EquityPlan" ADD CONSTRAINT "EquityPlan_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
