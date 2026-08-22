UPDATE "AdminMetrics"
SET "pageViews" = 0,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';

ALTER TABLE "AdminMetrics" DROP COLUMN IF EXISTS "signedUpUsersOverride";
ALTER TABLE "AdminMetrics" DROP COLUMN IF EXISTS "papersUploadedOverride";

DELETE FROM "Annotation";
DELETE FROM "Review";
DELETE FROM "Paper";
