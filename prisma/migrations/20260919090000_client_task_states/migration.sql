-- מועד וסימון "בוצע" למשימות ולהמלצות של הלקוח באזור האישי
CREATE TABLE "ClientTaskState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientTaskState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientTaskState_userId_key_key" ON "ClientTaskState"("userId", "key");
CREATE INDEX "ClientTaskState_userId_idx" ON "ClientTaskState"("userId");

ALTER TABLE "ClientTaskState" ADD CONSTRAINT "ClientTaskState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
