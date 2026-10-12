import type { NextRequest } from "next/server";
import { error, handleRouteError, json } from "@/lib/http";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  isPodcastEpisodeId,
  PODCAST_COMMENT_LIMIT,
} from "@/lib/podcasts-shared";

export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 300;

function clientAddress(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isSameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const episodeId = req.nextUrl.searchParams.get("episode");
    if (!isPodcastEpisodeId(episodeId)) return error("Unknown episode.", 404);

    const comments = await prisma.podcastComment.findMany({
      where: { episodeId },
      orderBy: { createdAt: "asc" },
      take: PODCAST_COMMENT_LIMIT,
      select: { id: true, body: true, createdAt: true },
    });

    return json({
      comments: comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
      })),
      limit: PODCAST_COMMENT_LIMIT,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return error("Invalid request origin.", 403);

    const limit = rateLimit(`podcast-comment:${clientAddress(req)}`, 5, 60_000);
    if (!limit.ok) {
      return error("Please wait a moment before posting another comment.", 429, {
        retryAfterMs: limit.retryAfterMs,
      });
    }

    const body = await req.json().catch(() => ({}));
    const episodeId = body.episodeId;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!isPodcastEpisodeId(episodeId)) return error("Unknown episode.", 404);
    if (!comment) return error("Write a comment before posting.");
    if (comment.length > MAX_COMMENT_LENGTH) {
      return error(`Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
    }

    const created = await prisma.$transaction(async (tx) => {
      // The count is reserved atomically before the comment is created. This
      // keeps the temporary cap at 15 even when several visitors post at once.
      await tx.podcastEpisode.upsert({
        where: { id: episodeId },
        create: { id: episodeId },
        update: {},
      });

      const reservation = await tx.podcastEpisode.updateMany({
        where: {
          id: episodeId,
          commentCount: { lt: PODCAST_COMMENT_LIMIT },
        },
        data: { commentCount: { increment: 1 } },
      });

      if (reservation.count === 0) return null;

      return tx.podcastComment.create({
        data: { episodeId, body: comment },
        select: { id: true, body: true, createdAt: true },
      });
    });

    if (!created) {
      return error(
        `This episode has reached its temporary ${PODCAST_COMMENT_LIMIT}-comment limit.`,
        409
      );
    }

    return json(
      {
        comment: { ...created, createdAt: created.createdAt.toISOString() },
        limit: PODCAST_COMMENT_LIMIT,
      },
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
