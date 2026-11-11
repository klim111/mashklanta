-- החלפות הטקסט והבאנרים שהיועץ עורך ב"תוכן האתר" (src/lib/site-content.ts),
-- ותמונות הבאנרים. בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס
-- הנתונים של הייצור, ופריסה שנכשלה מריצה אותן שוב.
CREATE TABLE IF NOT EXISTS "SiteContent" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "contentJson" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteImage" (
    "id" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteImage_pkey" PRIMARY KEY ("id")
);
