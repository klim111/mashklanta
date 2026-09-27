-- התכתבות לקוח–יועץ: צ'אט ומיילים

-- CreateEnum
CREATE TYPE "ConversationRole" AS ENUM ('CLIENT', 'ADVISOR');

-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "mailboxKey" TEXT;

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorRole" "ConversationRole" NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationEmail" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "direction" "EmailDirection" NOT NULL,
    "senderId" TEXT,
    "senderRole" "ConversationRole",
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddresses" TEXT[],
    "ccAddresses" TEXT[],
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "bank" TEXT,
    "providerId" TEXT,
    "messageId" TEXT,
    "readByClientAt" TIMESTAMP(3),
    "readByAdvisorAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mailboxKey_key" ON "User"("mailboxKey");

-- CreateIndex
CREATE INDEX "ConversationMessage_clientUserId_createdAt_idx" ON "ConversationMessage"("clientUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationEmail_providerId_key" ON "ConversationEmail"("providerId");

-- CreateIndex
CREATE INDEX "ConversationEmail_clientUserId_createdAt_idx" ON "ConversationEmail"("clientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationEmail" ADD CONSTRAINT "ConversationEmail_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationEmail" ADD CONSTRAINT "ConversationEmail_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
