import type { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
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
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isLocalhost(req: NextRequest) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const hostname = host.startsWith("[")
    ? host.slice(1, host.indexOf("]"))
    : host.split(":")[0];

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function visitorKey(req: NextRequest) {
  if (isLocalhost(req)) return null;

  // Store an opaque, stable identifier rather than the visitor's IP address.
  // DATABASE_URL is always configured when this route can reach Prisma; the
  // dedicated variable lets production rotate this identifier independently.
  const secret =
    process.env.PODCAST_COMMENT_IDENTITY_SECRET ||
    process.env.DATABASE_URL ||
    "docupeer-podcast-local-fallback";
  return createHmac("sha256", secret)
    .update(clientAddress(req))
    .digest("hex");
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

    const key = visitorKey(req);

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

    const local = isLocalhost(req);
    if (!local) {
      const limit = rateLimit(`podcast-comment:${clientAddress(req)}`, 5, 60_000);
      if (!limit.ok) {
        return error("Please wait a moment before posting another comment.", 429, {
          retryAfterMs: limit.retryAfterMs,
        });
      }
    }

    const key = local ? null : visitorKey(req);

    const body = await req.json().catch(() => ({}));
    const episodeId = body.episodeId;
    const comment = typeof body.comment === "string" ? body.comment.trim() : "";

    if (!isPodcastEpisodeId(episodeId)) return error("Unknown episode.", 404);
    if (!comment) return error("Write a comment before posting.");
    if (comment.length > MAX_COMMENT_LENGTH) {
      return error(`Comments can be up to ${MAX_COMMENT_LENGTH} characters.`);
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
