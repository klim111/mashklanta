/*
  Warnings:

  - You are about to drop the column `creditScore` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `downPayment` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `existingLoans` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `expenses` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `income` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `partnerIncome` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Client" DROP COLUMN "creditScore",
DROP COLUMN "downPayment",
DROP COLUMN "existingLoans",
DROP COLUMN "expenses",
DROP COLUMN "income",
DROP COLUMN "partnerIncome";

-- CreateIndex
CREATE INDEX "Client_advisorId_incomeBucket_idx" ON "public"."Client"("advisorId", "incomeBucket");
