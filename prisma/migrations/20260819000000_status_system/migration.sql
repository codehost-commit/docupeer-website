CREATE TABLE "SiteStatusState" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "level" INTEGER NOT NULL DEFAULT 1,
    "phase" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "etaAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStatusState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteStatusHistory" (
    "bucketTs" TIMESTAMP(3) NOT NULL,
    "statusLevel" INTEGER NOT NULL,

    CONSTRAINT "SiteStatusHistory_pkey" PRIMARY KEY ("bucketTs")
);

CREATE TABLE "SiteStatusReport" (
    "id" TEXT NOT NULL,
    "statusLevel" INTEGER NOT NULL,
    "phase" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteStatusReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteStatusReport_createdAt_idx" ON "SiteStatusReport"("createdAt");
