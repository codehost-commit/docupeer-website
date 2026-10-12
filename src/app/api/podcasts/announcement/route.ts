import { PodcastAnnouncementReactionKind } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { error, handleRouteError, json } from "@/lib/http";
import {
  isPodcastLocalhost,
  podcastClientAddress,
  podcastVisitorKey,
} from "@/lib/podcast-visitor";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
const localReactionCounts = { likes: 0, dislikes: 0 };

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

async function reactionCounts() {
  const grouped = await prisma.podcastAnnouncementReaction.groupBy({
    by: ["reaction"],
    _count: { _all: true },
  });

  return {
    likes:
      grouped.find((entry) => entry.reaction === PodcastAnnouncementReactionKind.LIKE)
        ?._count._all ?? 0,
    dislikes:
      grouped.find((entry) => entry.reaction === PodcastAnnouncementReactionKind.DISLIKE)
        ?._count._all ?? 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    if (isPodcastLocalhost(req)) {
      return json({ ...localReactionCounts, canVote: true });
    }

    const key = podcastVisitorKey(req);
    const [counts, existingReaction] = await Promise.all([
      reactionCounts(),
      key
        ? prisma.podcastAnnouncementReaction.findUnique({
            where: { visitorKey: key },
            select: { id: true },
          })
        : null,
    ]);

    return json({ ...counts, canVote: !existingReaction });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return error("Invalid request origin.", 403);

    const local = isPodcastLocalhost(req);
    if (!local) {
      const limit = rateLimit(
        `podcast-announcement:${podcastClientAddress(req)}`,
        5,
        60_000
      );
      if (!limit.ok) {
        return error("Please wait a moment before voting again.", 429, {
          retryAfterMs: limit.retryAfterMs,
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    if (body.reaction !== "like" && body.reaction !== "dislike") {
      return error("Choose a valid reaction.");
    }

    if (local) {
      localReactionCounts[body.reaction === "like" ? "likes" : "dislikes"] += 1;
      return json({ ...localReactionCounts, canVote: true }, 201);
    }

    const key = podcastVisitorKey(req);
    const reaction =
      body.reaction === "like"
        ? PodcastAnnouncementReactionKind.LIKE
        : PodcastAnnouncementReactionKind.DISLIKE;

    const result = await prisma.$transaction(async (tx) => {
      if (key) {
        const existingReaction = await tx.podcastAnnouncementReaction.findUnique({
          where: { visitorKey: key },
          select: { id: true },
        });
        if (existingReaction) return { status: "already-voted" as const };
      }

      await tx.podcastAnnouncementReaction.create({
        data: { visitorKey: key, reaction },
      });
      return { status: "created" as const };
    });

    if (result.status === "already-voted") {
      return error("You have already reacted to this announcement.", 409);
    }

    return json({ ...(await reactionCounts()), canVote: local }, 201);
  } catch (err) {
    // A simultaneous second tap may win the unique-key race above.
    if ((err as { code?: string })?.code === "P2002") {
      return error("You have already reacted to this announcement.", 409);
    }
    return handleRouteError(err);
  }
}
