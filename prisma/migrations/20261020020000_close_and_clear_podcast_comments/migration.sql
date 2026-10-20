DELETE FROM "PodcastComment";

UPDATE "PodcastEpisode"
SET "commentCount" = 0;
