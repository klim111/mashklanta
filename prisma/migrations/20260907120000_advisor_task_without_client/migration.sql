-- משימה של היועץ יכולה לעמוד בפני עצמה, בלי שיוך ללקוח
ALTER TABLE "AdvisorTask" ALTER COLUMN "clientId" DROP NOT NULL;
