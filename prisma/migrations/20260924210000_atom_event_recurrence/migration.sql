ALTER TABLE "AtomEvent"
ADD COLUMN "recurrence" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN "recurrenceEndAt" TIMESTAMP(3);
