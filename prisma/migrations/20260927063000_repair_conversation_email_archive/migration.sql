-- The migration 20260927050000 was edited after a preview build had already
-- applied it, so databases that ran the first version never got "archivedAt".
-- Prisma does not re-run an applied migration, so this one adds whatever is
-- missing. Every statement is a no-op where the column or index already exists.

-- AlterTable
ALTER TABLE "ConversationEmail" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
ALTER TABLE "ConversationEmail" ADD COLUMN IF NOT EXISTS "held" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConversationEmail" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mailboxName" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_mailboxName_key" ON "User"("mailboxName");
