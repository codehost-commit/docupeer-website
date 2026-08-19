CREATE TABLE "SiteLiveChunk" (
    "id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteLiveChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SiteLiveChunk_sequence_key" ON "SiteLiveChunk"("sequence");
CREATE INDEX "SiteLiveChunk_createdAt_idx" ON "SiteLiveChunk"("createdAt");
