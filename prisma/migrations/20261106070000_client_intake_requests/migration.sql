-- פניות מהעמוד הראשי דרך טופס פרטי הלקוח: בקשת מכרז ריביות או בדיקת מיחזור.
-- בטוח להרצה חוזרת.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "requestKind" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMP(3);
