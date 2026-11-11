-- מתי היועץ סימן שהליווי בתהליך הסתיים.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "MortgagePlan" ADD COLUMN IF NOT EXISTS "advisoryEndedAt" TIMESTAMP(3);
