import type { NextRequest } from "next/server";
import { error, handleRouteError, json } from "@/lib/http";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  isPodcastLocalhost,
  podcastClientAddress,
  podcastVisitorKey,
} from "@/lib/podcast-visitor";
import {
  isPodcastEpisodeId,
  PODCAST_COMMENT_LIMIT,
} from "@/lib/podcasts-shared";

export const dynamic = "force-dynamic";

const MAX_COMMENT_LENGTH = 300;
const localComments = new Map<
  string,
  Array<{ id: string; body: string; createdAt: string }>
>();

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

    if (isPodcastLocalhost(req)) {
      return json({
        comments: localComments.get(episodeId) || [],
        limit: PODCAST_COMMENT_LIMIT,
        canComment: true,
      });
    }

    const key = podcastVisitorKey(req);

    const [comments, existingComment] = await Promise.all([
      prisma.podcastComment.findMany({
        where: { episodeId },
        orderBy: { createdAt: "asc" },
        take: PODCAST_COMMENT_LIMIT,
        select: { id: true, body: true, createdAt: true },
      }),
      key
        ? prisma.podcastComment.findUnique({
            where: { visitorKey: key },
            select: { id: true },
          })
        : null,
    ]);

    return json({
      comments: comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
      })),
      limit: PODCAST_COMMENT_LIMIT,
      canComment: !existingComment,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return error("Invalid request origin.", 403);

    const local = isPodcastLocalhost(req);
    if (!local) {
      const limit = rateLimit(`podcast-comment:${podcastClientAddress(req)}`, 5, 60_000);
      if (!limit.ok) {
        return error("Please wait a moment before posting another comment.", 429, {
          retryAfterMs: limit.retryAfterMs,
        });
      }
    }

    const key = local ? null : podcastVisitorKey(req);

    const body = await req.json().catch(() => ({}));
    const episodeId = body.episodeId;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!isPodcastEpisodeId(episodeId)) return error("Unknown episode.", 404);
    if (!comment) return error("Write a comment before posting.");
    if (comment.length > MAX_COMMENT_LENGTH) {
      return error(`Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
    }

    if (local) {
      const comments = localComments.get(episodeId) || [];
      if (comments.length >= PODCAST_COMMENT_LIMIT) {
        return error(
          `This episode has reached its temporary ${PODCAST_COMMENT_LIMIT}-comment limit.`,
          409
        );
      }

      const created = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        body: comment,
        createdAt: new Date().toISOString(),
      };
      localComments.set(episodeId, [...comments, created]);
      return json(
        { comment: created, limit: PODCAST_COMMENT_LIMIT, canComment: true },
        201
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (key) {
        const existingComment = await tx.podcastComment.findUnique({
          where: { visitorKey: key },
          select: { id: true },
        });
        if (existingComment) return { status: "already-commented" as const };
      }

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

      if (reservation.count === 0) return { status: "episode-full" as const };

      const createdComment = await tx.podcastComment.create({
        data: { episodeId, body: comment, visitorKey: key },
        select: { id: true, body: true, createdAt: true },
      });
      return { status: "created" as const, comment: createdComment };
    });

    if (created.status === "already-commented") {
      return error("You can post one comment across DocuPeer Podcasts.", 409);
    }

    if (created.status === "episode-full") {
      return error(
        `This episode has reached its temporary ${PODCAST_COMMENT_LIMIT}-comment limit.`,
        409
      );
    }

    return json(
      {
        comment: {
          ...created.comment,
          createdAt: created.comment.createdAt.toISOString(),
        },
        limit: PODCAST_COMMENT_LIMIT,
        canComment: local,
      },
      201
    );
  } catch (err) {
    // A simultaneous second submission may win the unique-key race above.
    if ((err as { code?: string })?.code === "P2002") {
      return error("You can post one comment across DocuPeer Podcasts.", 409);
    }
    return handleRouteError(err);
  }
}
