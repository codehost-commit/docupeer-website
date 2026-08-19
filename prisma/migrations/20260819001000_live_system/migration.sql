CREATE TABLE "SiteLiveState" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT 'DocuPeer Live',
    "description" TEXT NOT NULL DEFAULT 'Live conversations, walkthroughs, and work sessions from the DocuPeer team.',
    "roomName" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteLiveState_pkey" PRIMARY KEY ("id")
);
