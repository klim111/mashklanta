-- מה שהלקוח הזין בכלים החינמיים לפני ההרשמה, עד שהמייל מאושר והחשבון נוצר.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "PendingRegistration" ADD COLUMN IF NOT EXISTS "toolDataJson" JSONB;
