CREATE TABLE "SiteLiveCandidate" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "candidate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLiveCandidate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SiteLiveCandidate_viewerId_side_createdAt_idx" ON "SiteLiveCandidate"("viewerId", "side", "createdAt");
CREATE INDEX "SiteLiveCandidate_createdAt_idx" ON "SiteLiveCandidate"("createdAt");
