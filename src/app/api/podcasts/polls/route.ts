import { NextResponse, type NextRequest } from "next/server";
import { verifyAdminCredentials } from "@/lib/admin-auth";
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
    return url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
      ? origin
      : null;
  } catch {
    return null;
  }
}

function isLocalRequest(req: NextRequest) {
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

function pollJson(req: NextRequest, data: unknown, status = 200) {
  return withLocalCors(req, json(data, status));
}

function pollError(req: NextRequest, message: string, status = 400) {
  return withLocalCors(req, error(message, status));
}

function validOrigin(req: NextRequest) {
  if (isLocalRequest(req)) return true;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === req.nextUrl.origin;
  } catch {
    return false;
  }
}

const pollInclude = {
  options: {
    orderBy: { position: "asc" as const },
    include: { _count: { select: { votes: true } } },
  },
};

async function pollList(visitorKey: string | null) {
  const now = new Date();
  const polls = await prisma.podcastPoll.findMany({
    orderBy: { createdAt: "desc" },
    include: pollInclude,
  });
  const votes = visitorKey
    ? await prisma.podcastPollVote.findMany({
        where: { visitorKey, pollId: { in: polls.map((poll) => poll.id) } },
        select: { pollId: true, optionId: true },
      })
    : [];
  const selected = new Map(votes.map((vote) => [vote.pollId, vote.optionId]));

  return polls.map((poll) => ({
    id: poll.id,
    title: poll.title,
    description: poll.description,
    createdAt: poll.createdAt,
    endsAt: poll.endsAt,
    totalVotes: poll.options.reduce((sum, option) => sum + option._count.votes, 0),
    options: poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      votes: option._count.votes,
    })),
    selectedOptionId: selected.get(poll.id) ?? null,
    canVote: (!poll.endsAt || poll.endsAt > now) && (!visitorKey || !selected.has(poll.id)),
  }));
}

export async function GET(req: NextRequest) {
  try {
    const visitorKey = isLocalRequest(req) ? null : podcastVisitorKey(req);
    return pollJson(req, { polls: await pollList(visitorKey) });
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}

export function OPTIONS(req: NextRequest) {
  return withLocalCors(req, new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    if (!validOrigin(req)) return pollError(req, "Invalid request origin.", 403);
    const body = await req.json().catch(() => ({}));

    if (body.action === "create") {
      if (!localOrigin(req)) {
        return pollError(req, "Poll creation is available only from localhost.", 403);
      }
      const limit = rateLimit(`podcast-poll-create:${podcastClientAddress(req)}`, 20, 60 * 60_000);
      if (!limit.ok) return pollError(req, "Too many poll creation attempts. Try again later.", 429);
      if (!verifyAdminCredentials("ADMIN", body.password)) {
        return pollError(req, "The admin password is incorrect.", 401);
      }

      const title = typeof body.title === "string" ? body.title.trim() : "";
      const description = typeof body.description === "string" ? body.description.trim() : "";
      const options = Array.isArray(body.options)
        ? body.options.map((option: unknown) => typeof option === "string" ? option.trim() : "")
        : [];

      if (!title || title.length > 120) return pollError(req, "Enter a poll title of up to 120 characters.");
      if (!description || description.length > 500) {
        return pollError(req, "Enter a description of up to 500 characters.");
      }
      if (options.length < 2 || options.length > 8 || options.some((option: string) => !option || option.length > 80)) {
        return pollError(req, "Add 2 to 8 choices, each up to 80 characters.");
      }
      if (new Set(options.map((option: string) => option.toLocaleLowerCase())).size !== options.length) {
        return pollError(req, "Each choice must be different.");
      }
      const durationMinutes = body.durationMinutes;
      if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 365 * 24 * 60) {
        return pollError(req, "Choose a poll duration between 1 minute and 365 days.");
      }

      await prisma.podcastPoll.create({
        data: {
          title,
          description,
          endsAt: new Date(Date.now() + durationMinutes * 60_000),
          options: {
            create: options.map((label: string, position: number) => ({ label, position })),
          },
        },
      });
      return pollJson(req, { polls: await pollList(null) }, 201);
    }

    if (body.action !== "vote") return pollError(req, "Choose a valid poll action.");
    const pollId = typeof body.pollId === "string" ? body.pollId : "";
    const optionId = typeof body.optionId === "string" ? body.optionId : "";
    if (!pollId || !optionId) return pollError(req, "Choose a poll option.");

    const local = isLocalRequest(req);
    if (local) {
      // The localhost Origin header is easy to forge outside a browser, so it
      // cannot by itself grant the unlimited-vote exception.
      if (!verifyAdminCredentials("ADMIN", body.password)) {
        const limit = rateLimit(`podcast-poll-local-vote:${podcastClientAddress(req)}`, 20, 60 * 60_000);
        return pollError(req, limit.ok ? "The admin password is incorrect." : "Too many password attempts. Try again later.", limit.ok ? 401 : 429);
      }
    } else {
      const limit = rateLimit(`podcast-poll-vote:${podcastClientAddress(req)}`, 20, 60_000);
      if (!limit.ok) return pollError(req, "Please wait a moment before voting again.", 429);
    }
    const visitorKey = local ? null : podcastVisitorKey(req);
    const option = await prisma.podcastPollOption.findFirst({
      where: {
        id: optionId,
        pollId,
        poll: { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
      },
      select: { id: true },
    });
    if (!option) {
      const poll = await prisma.podcastPoll.findUnique({ where: { id: pollId }, select: { endsAt: true } });
      if (poll?.endsAt && poll.endsAt <= new Date()) {
        return pollError(req, "This poll has ended.", 409);
      }
      return pollError(req, "That poll choice no longer exists.", 404);
    }

    await prisma.podcastPollVote.create({
      data: { pollId, optionId, visitorKey },
    });
    const polls = await pollList(visitorKey);
    return pollJson(req, { poll: polls.find((poll) => poll.id === pollId) }, 201);
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return pollError(req, "You have already voted in this poll.", 409);
    }
    if ((err as { code?: string })?.code === "P2003") {
      return pollError(req, "That poll choice no longer exists.", 404);
    }
    return withLocalCors(req, handleRouteError(err));
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!localOrigin(req)) {
      return pollError(req, "Poll deletion is available only from localhost.", 403);
    }
    const limit = rateLimit(`podcast-poll-delete:${podcastClientAddress(req)}`, 20, 60 * 60_000);
    if (!limit.ok) return pollError(req, "Too many deletion attempts. Try again later.", 429);
    const body = await req.json().catch(() => ({}));
    if (!verifyAdminCredentials("ADMIN", body.password)) {
      return pollError(req, "The admin password is incorrect.", 401);
    }
    const pollId = typeof body.pollId === "string" ? body.pollId : "";
    if (!pollId) return pollError(req, "Choose a poll to delete.");
    const deleted = await prisma.podcastPoll.deleteMany({ where: { id: pollId } });
    if (!deleted.count) return pollError(req, "That poll no longer exists.", 404);
    return pollJson(req, { deleted: true, pollId });
  } catch (err) {
    return withLocalCors(req, handleRouteError(err));
  }
}
