CREATE TABLE "PodcastPoll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastPoll_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodcastPollOption" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "PodcastPollOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PodcastPollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "visitorKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PodcastPollVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PodcastPollOption_pollId_position_idx" ON "PodcastPollOption"("pollId", "position");
CREATE UNIQUE INDEX "PodcastPollOption_id_pollId_key" ON "PodcastPollOption"("id", "pollId");
CREATE UNIQUE INDEX "PodcastPollVote_pollId_visitorKey_key" ON "PodcastPollVote"("pollId", "visitorKey");
CREATE INDEX "PodcastPollVote_optionId_idx" ON "PodcastPollVote"("optionId");

ALTER TABLE "PodcastPollOption" ADD CONSTRAINT "PodcastPollOption_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "PodcastPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PodcastPollVote" ADD CONSTRAINT "PodcastPollVote_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "PodcastPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PodcastPollVote" ADD CONSTRAINT "PodcastPollVote_optionId_pollId_fkey"
  FOREIGN KEY ("optionId", "pollId") REFERENCES "PodcastPollOption"("id", "pollId") ON DELETE CASCADE ON UPDATE CASCADE;
