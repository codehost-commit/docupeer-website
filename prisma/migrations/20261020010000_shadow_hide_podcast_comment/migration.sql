ALTER TABLE "PodcastComment"
ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "PodcastCommentShadowBan" (
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastCommentShadowBan_pkey" PRIMARY KEY ("visitorKey")
);

-- Preserve only the opaque visitor identifier before removing the reported
-- Episode 1 comment. The original IP address is never stored.
INSERT INTO "PodcastCommentShadowBan" ("visitorKey")
SELECT "visitorKey"
FROM "PodcastComment"
WHERE "id" = 'cmvfykase0002wnse2f117pp1'
  AND "episodeId" = 'season-2-episode-1'
  AND "body" = 'k'
  AND "visitorKey" IS NOT NULL
ON CONFLICT ("visitorKey") DO NOTHING;

DELETE FROM "PodcastComment"
WHERE "id" = 'cmvfykase0002wnse2f117pp1'
  AND "episodeId" = 'season-2-episode-1'
  AND "body" = 'k';

-- Keep the temporary public limit in sync after removing the comment.
UPDATE "PodcastEpisode"
SET "commentCount" = (
    SELECT COUNT(*)
    FROM "PodcastComment"
    WHERE "PodcastComment"."episodeId" = "PodcastEpisode"."id"
      AND "PodcastComment"."hidden" = false
)
WHERE "id" = 'season-2-episode-1';
