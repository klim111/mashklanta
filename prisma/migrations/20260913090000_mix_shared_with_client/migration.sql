-- תמהיל שיועץ בונה או מתמחר בתוך תיק של לקוח נשמר תחילה אצלו בלבד, ורק
-- "שדר תמהיל ללקוח" הופך אותו לגלוי. כל מה שנשמר עד היום היה גלוי ממילא,
-- ולכן ברירת המחדל היא true והרשומות הקיימות אינן משתנות.
ALTER TABLE "MortgageMix" ADD COLUMN "sharedWithClient" BOOLEAN NOT NULL DEFAULT true;
