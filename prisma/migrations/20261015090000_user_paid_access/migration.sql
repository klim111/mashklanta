-- גישה בתשלום שהיועץ הגדיר ללקוח לתקופה שהוא בוחר (src/lib/granted-access.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paidAccessFrom" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paidAccessUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paidAccessSetAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paidAccessSetBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paidAccessNote" TEXT;
