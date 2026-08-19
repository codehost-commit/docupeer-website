-- CreateTable
CREATE TABLE "AdminMetrics" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "signedUpUsersOverride" INTEGER,
    "papersUploadedOverride" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminMetrics_pkey" PRIMARY KEY ("id")
);
