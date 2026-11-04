import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminCredentials } from "@/lib/admin-auth";
import { error, handleRouteError, json } from "@/lib/http";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import {
  isPodcastLocalhost,
  podcastClientAddress,
  podcastVisitorKey,
} from "@/lib/podcast-visitor";
import {
  isPodcastCommentThreadId,
  PODCAST_COMMENTS_OPEN,
  PODCAST_FEEDBACK_POSTING_OPEN,
  PODCAST_FEEDBACK_THREAD_ID,
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
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
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
    const threadId =
      req.nextUrl.searchParams.get("thread") ||
      req.nextUrl.searchParams.get("episode");
    if (!isPodcastCommentThreadId(threadId)) {
      return commentError(req, "Unknown comment thread.", 404);
    }

    if (!PODCAST_COMMENTS_OPEN) {
      return commentJson(req, {
        comments: [],
        canComment: false,
      });
    }

    const local = isLocalCommentRequest(req);
    const key = local ? null : podcastVisitorKey(req);

    const comments = await prisma.podcastComment.findMany({
      where: {
        episodeId: threadId,
        OR: [
          { hidden: false },
          ...(key ? [{ hidden: true, visitorKey: key }] : []),
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, body: true, createdAt: true },
    });

    return commentJson(req, {
      comments: comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
      })),
      canComment: true,
    });
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}

export function OPTIONS(req: NextRequest) {
  return withLocalCors(req, new NextResponse(null, { status: 204 }));
}

export async function DELETE(req: NextRequest) {
  try {
    // Comment moderation is intentionally exposed only to the local testing
    // UI. The admin password is still required because Origin is not an
    // authentication boundary and can be forged by non-browser clients.
    if (!localOrigin(req)) {
      return commentError(req, "Comment deletion is available only from localhost.", 403);
    }

    const limit = rateLimit(
      `podcast-comment-delete:${podcastClientAddress(req)}`,
      20,
      60 * 60 * 1000
    );
    if (!limit.ok) {
      return commentError(req, "Too many deletion attempts. Try again later.", 429, {
        retryAfterMs: limit.retryAfterMs,
      });
    }

    const body = await req.json().catch(() => ({}));
    const commentId = typeof body.commentId === "string" ? body.commentId.trim() : "";
    if (!verifyAdminCredentials("ADMIN", body.password)) {
      return commentError(req, "The admin password is incorrect.", 401);
    }
    if (!commentId) return commentError(req, "Choose a comment to delete.");

    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.podcastComment.findUnique({
        where: { id: commentId },
        select: { id: true, episodeId: true, hidden: true },
      });
      if (!existing) return null;

      await tx.podcastComment.delete({ where: { id: commentId } });
      if (!existing.hidden) {
        await tx.podcastEpisode.updateMany({
          where: { id: existing.episodeId, commentCount: { gt: 0 } },
          data: { commentCount: { decrement: 1 } },
        });
      }

      return existing;
    });

    if (!deleted) return commentError(req, "That comment no longer exists.", 404);
    return commentJson(req, { deleted: true, commentId: deleted.id });
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return commentError(req, "Invalid request origin.", 403);
    if (!PODCAST_COMMENTS_OPEN) {
      return commentError(req, "Comments are closed for now.", 403);
    }

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
    const threadId = body.threadId || body.episodeId;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!isPodcastCommentThreadId(threadId)) {
      return commentError(req, "Unknown comment thread.", 404);
    }
    if (
      threadId === PODCAST_FEEDBACK_THREAD_ID &&
      !PODCAST_FEEDBACK_POSTING_OPEN
    ) {
      return commentError(req, "This feedback thread is read-only for now.", 403);
    }
    if (!comment) return commentError(req, "Write a comment before posting.");
    if (comment.length > MAX_COMMENT_LENGTH) {
      return commentError(req, `Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
    }

    const created = await prisma.$transaction(async (tx) => {
      const shadowBan = key
        ? await tx.podcastCommentShadowBan.findUnique({
            where: { visitorKey: key },
            select: { visitorKey: true },
          })
        : null;

      await tx.podcastEpisode.upsert({
        where: { id: threadId },
        create: { id: threadId },
        update: {},
      });

      if (!shadowBan) {
        await tx.podcastEpisode.update({
          where: { id: threadId },
          data: { commentCount: { increment: 1 } },
        });
      }

      const createdComment = await tx.podcastComment.create({
        data: {
          episodeId: threadId,
          body: comment,
          visitorKey: key,
          hidden: Boolean(shadowBan),
        },
        select: { id: true, body: true, createdAt: true },
      });
      return createdComment;
    });

    return commentJson(
      req,
      {
        comment: {
          ...created,
          createdAt: created.createdAt.toISOString(),
        },
        canComment: true,
      },
      201
    );
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}
