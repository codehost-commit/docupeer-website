CREATE TABLE "PodcastEpisode" (
    "id" TEXT NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PodcastEpisode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodcastComment" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PodcastComment_episodeId_createdAt_idx" ON "PodcastComment"("episodeId", "createdAt");

ALTER TABLE "PodcastComment" ADD CONSTRAINT "PodcastComment_episodeId_fkey"
  FOREIGN KEY ("episodeId") REFERENCES "PodcastEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
