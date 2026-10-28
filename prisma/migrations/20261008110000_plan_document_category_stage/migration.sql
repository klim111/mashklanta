-- תיק המסמכים: קטגוריה (לבנק, לעורך הדין, למוכר, לעצמי) ושיוך לשלב לכל מסמך.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "PlanDocument" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "PlanDocument" ADD COLUMN IF NOT EXISTS "stage" TEXT;
