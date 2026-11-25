-- פגישות בלינק חד-פעמי ותיקי לקוחות מתעניינים (src/lib/guest-meetings.ts, src/lib/prospect-client.ts).
-- בטוח להרצה חוזרת: בניית Preview מריצה את המיגרציות על בסיס הנתונים של
-- הייצור, ופריסה שנכשלה מריצה אותן שוב.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "prospect" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "GuestMeeting" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "guestName" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 90,
    "note" TEXT,
    "clientId" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GuestMeeting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GuestMeeting_token_key" ON "GuestMeeting"("token");
CREATE INDEX IF NOT EXISTS "GuestMeeting_advisorId_startsAt_idx" ON "GuestMeeting"("advisorId", "startsAt");

DO $$ BEGIN
  ALTER TABLE "GuestMeeting" ADD CONSTRAINT "GuestMeeting_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "GuestMeeting" ADD CONSTRAINT "GuestMeeting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
