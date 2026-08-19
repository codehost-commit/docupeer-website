CREATE TABLE "SiteLivePeer" (
    "viewerId" TEXT NOT NULL,
    "offerSdp" TEXT NOT NULL,
    "answerSdp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteLivePeer_pkey" PRIMARY KEY ("viewerId")
);

CREATE INDEX "SiteLivePeer_status_updatedAt_idx" ON "SiteLivePeer"("status", "updatedAt");
CREATE INDEX "SiteLivePeer_updatedAt_idx" ON "SiteLivePeer"("updatedAt");
