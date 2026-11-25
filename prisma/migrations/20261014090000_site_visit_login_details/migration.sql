-- פרטי ההתחברות בביקורים של משתמשים מחוברים: IP, דפדפן, מערכת הפעלה ומיקום.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "ip" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "browser" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "os" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "location" TEXT;

CREATE INDEX IF NOT EXISTS "SiteVisit_userId_startedAt_idx" ON "SiteVisit"("userId", "startedAt");
