-- לקוח שהיועץ פתח לו תיק: סימון כלקוח בתשלום (לא בליווי) ומועד שליחת פרטי הכניסה (src/lib/client-invite.ts).
-- בטוח להרצה חוזרת, כמו שאר המיגרציות.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "selfPay" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "invitedAt" TIMESTAMP(3);
