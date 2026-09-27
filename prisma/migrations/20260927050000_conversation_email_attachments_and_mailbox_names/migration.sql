-- AlterTable
ALTER TABLE "ConversationEmail" ADD COLUMN "attachments" JSONB;
ALTER TABLE "ConversationEmail" ADD COLUMN "held" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationEmail" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "mailboxName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_mailboxName_key" ON "User"("mailboxName");
