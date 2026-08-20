-- CreateTable
CREATE TABLE "TalkSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "displayName" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "consentToPublish" BOOLEAN NOT NULL DEFAULT false,
    "suggestedCategory" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TalkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TalkSubmission_status_createdAt_idx" ON "TalkSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TalkSubmission_category_status_idx" ON "TalkSubmission"("category", "status");

-- CreateIndex
CREATE INDEX "TalkSubmission_featured_status_idx" ON "TalkSubmission"("featured", "status");
