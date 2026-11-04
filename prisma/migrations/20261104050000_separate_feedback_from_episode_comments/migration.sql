INSERT INTO "PodcastEpisode" ("id", "commentCount")
VALUES ('season-2-episode-2', 0)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "PodcastEpisode" ("id", "commentCount")
VALUES ('podcast-feedback-v2', 0)
ON CONFLICT ("id") DO NOTHING;

-- The previous migration consolidated episode comments into the first
-- feedback thread. Return that entire thread to the podcast and start the
-- corrected feedback thread separately.
UPDATE "PodcastComment"
SET "episodeId" = 'season-2-episode-2'
WHERE "episodeId" = 'podcast-feedback';

UPDATE "PodcastEpisode"
SET "commentCount" = (
  SELECT COUNT(*)::integer
  FROM "PodcastComment"
  WHERE "episodeId" = "PodcastEpisode"."id"
    AND "hidden" = false
)
WHERE "id" IN (
  'podcast-feedback',
  'podcast-feedback-v2',
  'season-2-episode-2'
);
