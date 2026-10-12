CREATE TYPE "PodcastAnnouncementReactionKind" AS ENUM ('LIKE', 'DISLIKE');

CREATE TABLE "PodcastAnnouncementReaction" (
    "id" TEXT NOT NULL,
    "visitorKey" TEXT,
    "reaction" "PodcastAnnouncementReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastAnnouncementReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PodcastAnnouncementReaction_visitorKey_key"
  ON "PodcastAnnouncementReaction"("visitorKey");

CREATE INDEX "PodcastAnnouncementReaction_reaction_idx"
  ON "PodcastAnnouncementReaction"("reaction");
