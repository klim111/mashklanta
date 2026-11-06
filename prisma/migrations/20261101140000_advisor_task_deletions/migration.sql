-- רישום המשימות שהיועץ מחק (src/lib/advisor.ts, deleteAdvisorTask).
-- בטוח להרצה חוזרת.
CREATE TABLE IF NOT EXISTS "AdvisorTaskDeletion" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientName" TEXT,
    "stage" "PlanStage" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "AdvisorTaskStatus" NOT NULL,
    "taskCreatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdvisorTaskDeletion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdvisorTaskDeletion_advisorId_deletedAt_idx" ON "AdvisorTaskDeletion"("advisorId", "deletedAt");
