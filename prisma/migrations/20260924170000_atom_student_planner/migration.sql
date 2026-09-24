-- AlterTable
ALTER TABLE "User" ADD COLUMN     "atomOnboardedAt" TIMESTAMP(3),
ADD COLUMN     "atomGradeLevel" TEXT,
ADD COLUMN     "atomAvatarUrl" TEXT,
ADD COLUMN     "gpaScale" TEXT NOT NULL DEFAULT '4.0';

-- CreateTable
CREATE TABLE "AtomClass" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher" TEXT,
    "period" TEXT,
    "schoolYear" TEXT,
    "term" TEXT,
    "credits" DOUBLE PRECISION DEFAULT 1,
    "gradingSystem" TEXT NOT NULL DEFAULT 'weighted',
    "color" TEXT NOT NULL DEFAULT '#356d97',
    "includeInGpa" BOOLEAN NOT NULL DEFAULT true,
    "gpaWeight" TEXT NOT NULL DEFAULT 'regular',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtomClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomCategory" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dropLowest" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AtomCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'homework',
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "hasTime" BOOLEAN NOT NULL DEFAULT false,
    "pointsEarned" DOUBLE PRECISION,
    "pointsPossible" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomECDeadline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT,
    "type" TEXT NOT NULL DEFAULT 'other',
    "dueAt" TIMESTAMP(3),
    "hasTime" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "link" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtomECDeadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "hasTime" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "category" TEXT NOT NULL DEFAULT 'academic',
    "relatedType" TEXT,
    "relatedId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtomTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT NOT NULL DEFAULT 'personal',
    "color" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomGradeSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "letter" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtomGradeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDefaults" JSONB,
    "categoryMutes" JSONB,
    "quietHours" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtomSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomPushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtomPushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtomNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "itemType" TEXT,
    "itemId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "pushSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtomNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtomClass_userId_archived_idx" ON "AtomClass"("userId", "archived");

-- CreateIndex
CREATE INDEX "AtomCategory_classId_idx" ON "AtomCategory"("classId");

-- CreateIndex
CREATE INDEX "AtomAssignment_userId_dueAt_idx" ON "AtomAssignment"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "AtomAssignment_classId_idx" ON "AtomAssignment"("classId");

-- CreateIndex
CREATE INDEX "AtomAssignment_categoryId_idx" ON "AtomAssignment"("categoryId");

-- CreateIndex
CREATE INDEX "AtomECDeadline_userId_dueAt_idx" ON "AtomECDeadline"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "AtomTask_userId_dueAt_idx" ON "AtomTask"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "AtomTask_userId_status_idx" ON "AtomTask"("userId", "status");

-- CreateIndex
CREATE INDEX "AtomEvent_userId_startAt_idx" ON "AtomEvent"("userId", "startAt");

-- CreateIndex
CREATE INDEX "AtomGradeSnapshot_classId_capturedAt_idx" ON "AtomGradeSnapshot"("classId", "capturedAt");

-- CreateIndex
CREATE INDEX "AtomGradeSnapshot_userId_idx" ON "AtomGradeSnapshot"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AtomSettings_userId_key" ON "AtomSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AtomPushSubscription_endpoint_key" ON "AtomPushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "AtomPushSubscription_userId_idx" ON "AtomPushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AtomNotification_userId_dedupeKey_key" ON "AtomNotification"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "AtomNotification_userId_createdAt_idx" ON "AtomNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AtomNotification_userId_readAt_idx" ON "AtomNotification"("userId", "readAt");

-- AddForeignKey
ALTER TABLE "AtomClass" ADD CONSTRAINT "AtomClass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomCategory" ADD CONSTRAINT "AtomCategory_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AtomClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomAssignment" ADD CONSTRAINT "AtomAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomAssignment" ADD CONSTRAINT "AtomAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AtomClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomAssignment" ADD CONSTRAINT "AtomAssignment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AtomCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomECDeadline" ADD CONSTRAINT "AtomECDeadline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomTask" ADD CONSTRAINT "AtomTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomTask" ADD CONSTRAINT "AtomTask_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AtomClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomEvent" ADD CONSTRAINT "AtomEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomGradeSnapshot" ADD CONSTRAINT "AtomGradeSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomGradeSnapshot" ADD CONSTRAINT "AtomGradeSnapshot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AtomClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomSettings" ADD CONSTRAINT "AtomSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomPushSubscription" ADD CONSTRAINT "AtomPushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtomNotification" ADD CONSTRAINT "AtomNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
