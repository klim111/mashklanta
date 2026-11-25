-- המשרד הדיגיטלי של היועץ (src/lib/office.ts) והכלים שהיועץ פותח או סוגר ללקוח.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב. רק טבלה ועמודה חדשות — שום דבר קיים לא משתנה.
CREATE TABLE IF NOT EXISTS "Office" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "profileJson" JSONB NOT NULL DEFAULT '{}',
    "toolsJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Office_ownerId_key" ON "Office"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Office_slug_key" ON "Office"("slug");

DO $$ BEGIN
  ALTER TABLE "Office" ADD CONSTRAINT "Office_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "toolAccessJson" JSONB;
