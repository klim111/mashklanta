-- סוג הפנייה ליועץ (ליווי, פגישה, שאלה, הצעת מחיר) והעמוד שממנו נשלחה.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "AdvisorLead" ADD COLUMN IF NOT EXISTS "requestKind" TEXT;
ALTER TABLE "AdvisorLead" ADD COLUMN IF NOT EXISTS "sourcePath" TEXT;
