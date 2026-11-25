-- היועץ מסמן שהוא כבר עובד על השלב אחרי שהתשלום סודר מולו.
-- משלב זה הלקוח אינו יכול למחוק את התהליך.
ALTER TABLE "AdvisorServiceOrder" ADD COLUMN IF NOT EXISTS "workStartedAt" TIMESTAMP(3);
