-- טיוטת היועץ בשלב של לקוח, עד שהוא משדר אותה (src/lib/advisor-draft.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "MortgagePlanStage" ADD COLUMN IF NOT EXISTS "advisorDraftJson" JSONB;
ALTER TABLE "MortgageCase" ADD COLUMN IF NOT EXISTS "advisorDraftJson" JSONB;
