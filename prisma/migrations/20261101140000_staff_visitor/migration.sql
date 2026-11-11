-- דפדפנים של היועץ, שהביקורים מהם לא נספרים בדאשבורד הביקורים.
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
CREATE TABLE IF NOT EXISTS "StaffVisitor" (
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffVisitor_pkey" PRIMARY KEY ("visitorId")
);
