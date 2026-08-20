CREATE TABLE "SiteLaunchState" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "isLaunched" BOOLEAN NOT NULL DEFAULT false,
    "targetAt" TIMESTAMP(3) NOT NULL,
    "launchedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLaunchState_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteLaunchState" ("id", "isLaunched", "targetAt", "updatedAt")
VALUES ('global', false, TIMESTAMP '2026-08-20 04:50:00', CURRENT_TIMESTAMP);
