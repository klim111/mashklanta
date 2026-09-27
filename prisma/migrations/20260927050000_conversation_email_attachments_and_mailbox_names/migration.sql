-- Idempotent: an earlier build may have applied part of this migration (see
-- 20260927063000_repair_conversation_email_archive), so every statement is a
-- no-op where its column or index already exists.

-- AlterTable
ALTER TABLE "ConversationEmail" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "ConversationEmail" ADD COLUMN IF NOT EXISTS "held" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationEmail" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mailboxName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_mailboxName_key" ON "User"("mailboxName");
