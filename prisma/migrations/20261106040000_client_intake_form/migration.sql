-- טופס פרטי הלקוח: מתי הופק ללקוח קישור לטופס, ומתי הלקוח שידר אותו ליועץ.
-- בטוח להרצה חוזרת.
ALTER TABLE "MortgageCase" ADD COLUMN IF NOT EXISTS "intakeRequestedAt" TIMESTAMP(3);
ALTER TABLE "MortgageCase" ADD COLUMN IF NOT EXISTS "intakeSubmittedAt" TIMESTAMP(3);
