-- Reset admin stats to zero for production launch.
UPDATE "AdminMetrics"
SET "pageViews" = 0,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'global';

-- Unique visitor table (per-browser cookie). One row per unique visitor.
CREATE TABLE IF NOT EXISTS "PageViewVisitor" (
    "visitorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageViewVisitor_pkey" PRIMARY KEY ("visitorId")
);

-- Drop the launch-countdown table (feature removed).
DROP TABLE IF EXISTS "SiteLaunchState";

-- Clear any historical status reports so the site starts with a blank
-- message log in production.
DELETE FROM "SiteStatusReport";
