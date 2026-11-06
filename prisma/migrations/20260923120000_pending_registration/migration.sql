-- הרשמה ממתינה: החשבון נוצר רק אחרי אישור הקישור שנשלח במייל

-- CreateTable
CREATE TABLE "PendingRegistration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT,
    "hashedPassword" TEXT,
    "image" TEXT,
    "provider" TEXT,
    "providerAccountId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "deviceHash" TEXT,
    "callbackUrl" TEXT,
    "expires" TIMESTAMP(3) NOT NULL,
    "sendCount" INTEGER NOT NULL DEFAULT 1,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_email_key" ON "PendingRegistration"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingRegistration_tokenHash_key" ON "PendingRegistration"("tokenHash");

-- CreateIndex
CREATE INDEX "PendingRegistration_username_idx" ON "PendingRegistration"("username");

-- CreateIndex
CREATE INDEX "PendingRegistration_expires_idx" ON "PendingRegistration"("expires");
