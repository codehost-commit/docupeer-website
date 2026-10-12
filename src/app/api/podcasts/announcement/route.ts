import { PodcastAnnouncementReactionKind } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { error, handleRouteError, json } from "@/lib/http";
import {
  isPodcastLocalhost,
  podcastClientAddress,
  podcastVisitorKey,
} from "@/lib/podcast-visitor";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function localOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return null;

  try {
    const url = new URL(origin);
    const localHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";
    return url.protocol === "http:" && localHost ? origin : null;
  } catch {
    return null;
  }
}

function isLocalAnnouncementRequest(req: NextRequest) {
  return isPodcastLocalhost(req) || Boolean(localOrigin(req));
}

function withLocalCors(req: NextRequest, response: NextResponse) {
  const origin = localOrigin(req);
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "content-type");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

function announcementJson(req: NextRequest, data: unknown, status = 200) {
  return withLocalCors(req, json(data, status));
}

function announcementError(
  req: NextRequest,
  message: string,
  status = 400,
  extra?: object
) {
  return withLocalCors(req, error(message, status, extra));
}

function isSameOrigin(req: NextRequest) {
  if (isLocalAnnouncementRequest(req)) return true;

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
    const local = isLocalAnnouncementRequest(req);
    const key = local ? null : podcastVisitorKey(req);
    const [counts, existingReaction] = await Promise.all([
      reactionCounts(),
      key
        ? prisma.podcastAnnouncementReaction.findUnique({
            where: { visitorKey: key },
            select: { id: true },
          })
        : null,
    ]);

    return announcementJson(req, { ...counts, canVote: local || !existingReaction });
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}

export function OPTIONS(req: NextRequest) {
  return withLocalCors(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return announcementError(req, "Invalid request origin.", 403);

    const local = isLocalAnnouncementRequest(req);
    if (!local) {
      const limit = rateLimit(
        `podcast-announcement:${podcastClientAddress(req)}`,
        5,
        60_000
      );
      if (!limit.ok) {
        return announcementError(req, "Please wait a moment before voting again.", 429, {
          retryAfterMs: limit.retryAfterMs,
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    if (body.reaction !== "like" && body.reaction !== "dislike") {
      return announcementError(req, "Choose a valid reaction.");
    }

    const key = local ? null : podcastVisitorKey(req);
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
      return announcementError(req, "You have already reacted to this announcement.", 409);
    }

    return announcementJson(req, { ...(await reactionCounts()), canVote: local }, 201);
  } catch (err) {
    // A simultaneous second tap may win the unique-key race above.
    if ((err as { code?: string })?.code === "P2002") {
      return announcementError(req, "You have already reacted to this announcement.", 409);
    }
    return withLocalCors(req, handleRouteError(err));
  }
}
