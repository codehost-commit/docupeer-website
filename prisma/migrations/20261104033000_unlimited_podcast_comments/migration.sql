DROP INDEX "PodcastComment_visitorKey_key";

CREATE INDEX "PodcastComment_visitorKey_idx"
ON "PodcastComment"("visitorKey");

INSERT INTO "PodcastEpisode" ("id", "commentCount")
VALUES ('podcast-feedback', 0)
ON CONFLICT ("id") DO NOTHING;

UPDATE "PodcastComment"
SET "episodeId" = 'podcast-feedback';

UPDATE "PodcastEpisode"
SET "commentCount" = (
  SELECT COUNT(*)::integer
  FROM "PodcastComment"
  WHERE "episodeId" = 'podcast-feedback'
    AND "hidden" = false
)
WHERE "id" = 'podcast-feedback';
