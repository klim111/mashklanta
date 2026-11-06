-- מה שאורח הזין בכלים החינמיים, בדרך להתחברות עם גוגל (src/lib/guest-carry.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
CREATE TABLE IF NOT EXISTS "GuestCarry" (
    "id" TEXT NOT NULL,
    "toolDataJson" JSONB NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestCarry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GuestCarry_expires_idx" ON "GuestCarry"("expires");
