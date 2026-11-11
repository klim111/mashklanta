-- מי הציע את המועד הנוכחי של הפגישה: הצד השני הוא שמאשר או מציע מועד אחר
CREATE TYPE "MeetingParty" AS ENUM ('ADVISOR', 'CLIENT');

ALTER TABLE "AdvisorMeeting" ADD COLUMN "proposedBy" "MeetingParty" NOT NULL DEFAULT 'ADVISOR';
