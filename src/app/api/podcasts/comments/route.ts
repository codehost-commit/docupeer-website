import { NextResponse, type NextRequest } from "next/server";
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

function isLocalCommentRequest(req: NextRequest) {
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

function commentJson(req: NextRequest, data: unknown, status = 200) {
  return withLocalCors(req, json(data, status));
}

function commentError(
  req: NextRequest,
  message: string,
  status = 400,
  extra?: object
) {
  return withLocalCors(req, error(message, status, extra));
}

function isSameOrigin(req: NextRequest) {
  if (isLocalCommentRequest(req)) return true;

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
    if (!isPodcastEpisodeId(episodeId)) return commentError(req, "Unknown episode.", 404);

    const local = isLocalCommentRequest(req);
    const key = local ? null : podcastVisitorKey(req);

    const [comments, existingComment] = await Promise.all([
      prisma.podcastComment.findMany({
        where: { episodeId },
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true },
      }),
      key
        ? prisma.podcastComment.findUnique({
            where: { visitorKey: key },
            select: { id: true },
          })
        : null,
    ]);

    return commentJson(req, {
      comments: comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
      })),
      limit: PODCAST_COMMENT_LIMIT,
      canComment: local || !existingComment,
    });
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}

export function OPTIONS(req: NextRequest) {
  return withLocalCors(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return commentError(req, "Invalid request origin.", 403);

    const local = isLocalCommentRequest(req);
    if (!local) {
      const limit = rateLimit(`podcast-comment:${podcastClientAddress(req)}`, 5, 60_000);
      if (!limit.ok) {
        return commentError(req, "Please wait a moment before posting another comment.", 429, {
          retryAfterMs: limit.retryAfterMs,
        });
      }
    }

    const key = local ? null : podcastVisitorKey(req);

    const body = await req.json().catch(() => ({}));
    const episodeId = body.episodeId;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!isPodcastEpisodeId(episodeId)) return commentError(req, "Unknown episode.", 404);
    if (!comment) return commentError(req, "Write a comment before posting.");
    if (comment.length > MAX_COMMENT_LENGTH) {
      return commentError(req, `Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
    }

    const created = await prisma.$transaction(async (tx) => {
      if (key) {
        const existingComment = await tx.podcastComment.findUnique({
          where: { visitorKey: key },
          select: { id: true },
        });
        if (existingComment) return { status: "already-commented" as const };
      }

      await tx.podcastEpisode.upsert({
        where: { id: episodeId },
        create: { id: episodeId },
        update: {},
      });

      if (!local) {
        // The count is reserved atomically before a public comment is created.
        // Localhost intentionally bypasses this temporary public limit while
        // writing to the very same production thread for testing.
        const reservation = await tx.podcastEpisode.updateMany({
          where: {
            id: episodeId,
            commentCount: { lt: PODCAST_COMMENT_LIMIT },
          },
          data: { commentCount: { increment: 1 } },
        });

        if (reservation.count === 0) return { status: "episode-full" as const };
      }

      const createdComment = await tx.podcastComment.create({
        data: { episodeId, body: comment, visitorKey: key },
        select: { id: true, body: true, createdAt: true },
      });
      return { status: "created" as const, comment: createdComment };
    });

    if (created.status === "already-commented") {
      return commentError(req, "You can post one comment across DocuPeer Podcasts.", 409);
    }

    if (created.status === "episode-full") {
      return commentError(
        req,
        `This episode has reached its temporary ${PODCAST_COMMENT_LIMIT}-comment limit.`,
        409
      );
    }

    return commentJson(
      req,
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
      return commentError(req, "You can post one comment across DocuPeer Podcasts.", 409);
    }
    return withLocalCors(req, handleRouteError(err));
  }
}
