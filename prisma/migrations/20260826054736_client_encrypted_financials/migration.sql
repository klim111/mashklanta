-- CreateEnum
CREATE TYPE "public"."IncomeBucket" AS ENUM ('UNDER_10K', 'FROM_10K_TO_15K', 'FROM_15K_TO_25K', 'FROM_25K_TO_40K', 'ABOVE_40K');

-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "creditScoreEnc" TEXT,
ADD COLUMN     "downPaymentEnc" TEXT,
ADD COLUMN     "existingLoansEnc" TEXT,
ADD COLUMN     "expensesEnc" TEXT,
ADD COLUMN     "incomeBucket" "public"."IncomeBucket",
ADD COLUMN     "incomeEnc" TEXT,
ADD COLUMN     "partnerIncomeEnc" TEXT;
