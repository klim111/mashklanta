-- הטקסטים של דפי הנחיתה שהיועץ עורך (src/lib/landing-content.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
CREATE TABLE IF NOT EXISTS "LandingContent" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contentJson" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingContent_pkey" PRIMARY KEY ("id")
);
