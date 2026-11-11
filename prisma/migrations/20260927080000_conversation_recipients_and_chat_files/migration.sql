-- Every statement is safe to run twice: preview builds migrate the production
-- database, and a failed deploy re-runs the migration.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConversationRecipient" (
    "id" TEXT NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bank" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ConversationRecipient_clientUserId_email_key" ON "ConversationRecipient"("clientUserId", "email");

-- AddForeignKey
DO $$
BEGIN
    ALTER TABLE "ConversationRecipient" ADD CONSTRAINT "ConversationRecipient_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "ConversationMessage" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
