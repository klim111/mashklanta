-- הנתונים שהלקוח הזין בכלים הפתוחים, לפני ההרשמה ואחריה (src/lib/tool-data.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "toolDataJson" JSONB;
