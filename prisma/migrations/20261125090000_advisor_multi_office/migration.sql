-- פתיחת הפלטפורמה ליועצים נוספים: בקשות הצטרפות של יועצים, השעיית משרד,
-- ושיוך לקוח למשרד שדרכו נרשם — נשמר במסד ולא רק בעוגייה של הדפדפן.
-- בטוח להרצה חוזרת (IF NOT EXISTS). רק טבלה ועמודות חדשות; שום דבר קיים לא משתנה.

DO $$ BEGIN
  CREATE TYPE "AdvisorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AdvisorApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "officeName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "website" TEXT,
    "message" TEXT,
    "status" "AdvisorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "decisionNote" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AdvisorApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdvisorApplication_status_createdAt_idx" ON "AdvisorApplication"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "AdvisorApplication_email_idx" ON "AdvisorApplication"("email");

ALTER TABLE "Office" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "PendingRegistration" ADD COLUMN IF NOT EXISTS "officeSlug" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "signupOfficeId" TEXT;
