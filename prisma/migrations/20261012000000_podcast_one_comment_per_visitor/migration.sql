-- Existing comments deliberately retain a NULL visitor key: their anonymous
-- authorship cannot be reconstructed safely after the fact.
ALTER TABLE "PodcastComment" ADD COLUMN "visitorKey" TEXT;

CREATE UNIQUE INDEX "PodcastComment_visitorKey_key" ON "PodcastComment"("visitorKey");
