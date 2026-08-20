UPDATE "SiteLaunchState"
SET "targetAt" = TIMESTAMP '2026-08-20 05:00:00',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';
