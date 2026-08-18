import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/sanitize";
import { screenReview } from "@/lib/ai-detection";
import { ANNOTATION_KINDS } from "@/lib/constants";
import { json, error, handleRouteError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

type IncomingAnnotation = {
  startOffset: number;
  endOffset: number;
  quotedText: string;
  kind: string;
  body: string;
};

// POST /api/reviews -> submit a completed review.
// Server-side guarantees:
//  - must be authenticated
//  - cannot review your own paper
//  - cannot review the same paper twice (unique constraint => no double-count)
//  - review text is screened for AI content and blocked above the threshold
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`review:${user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many reviews too quickly. Slow down.", 429);

    const body = await req.json().catch(() => ({}));
    const paperId = String(body.paperId ?? "");
    const comment = sanitizeText(body.comment ?? "", 10_000).trim();
    const rawAnnotations: IncomingAnnotation[] = Array.isArray(body.annotations)
      ? body.annotations
      : [];

    if (!paperId) return error("Missing paper.", 400);

    // A review needs *some* substance: a comment or at least one annotation.
    const hasAnnotations = rawAnnotations.length > 0;
    if (comment.length < 20 && !hasAnnotations) {
      return json(
        {
          errors: {
            comment:
              "Add a written comment (20+ chars) or at least one highlight before submitting.",
          },
        },
        422
      );
    }

    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
      select: { id: true, authorId: true, text: true },
    });
    if (!paper) return error("Paper not found.", 404);

    if (paper.authorId === user.id)
      return error("You cannot review your own paper.", 403, {
        code: "OWN_PAPER",
      });

    // Reject duplicate up-front for a friendly message (the DB unique index is
    // the real guarantee against races / double counting).
    const existing = await prisma.review.findUnique({
      where: { reviewerId_paperId: { reviewerId: user.id, paperId } },
      select: { id: true },
    });
    if (existing)
      return error("You have already reviewed this paper.", 409, {
        code: "ALREADY_REVIEWED",
      });

    // Clean + validate annotations against the actual paper length.
    const textLen = paper.text.length;
    const annotations = rawAnnotations
      .filter(
        (a) =>
          ANNOTATION_KINDS.includes(a.kind as never) &&
          Number.isFinite(a.startOffset) &&
          Number.isFinite(a.endOffset)
      )
      .map((a) => {
        const start = Math.max(0, Math.min(textLen, Math.floor(a.startOffset)));
        const end = Math.max(start, Math.min(textLen, Math.floor(a.endOffset)));
        return {
          startOffset: start,
          endOffset: end,
          quotedText: sanitizeText(a.quotedText ?? "", 2_000),
          kind: String(a.kind),
          body: sanitizeText(a.body ?? "", 4_000),
        };
      })
      // "remove" needs no body; "add"/"comment" should carry an explanation.
      .filter((a) => a.kind === "remove" || a.body.trim().length > 0)
      .slice(0, 100);

    // --- AI-content screening (pluggable provider, configurable threshold) ---
    const screenText = [comment, ...annotations.map((a) => a.body)]
      .join("\n")
      .trim();
    const screen = await screenReview(screenText);
    if (!screen.allowed) {
      return error(
        `This review was blocked because it appears to contain more than ${Math.round(
          screen.threshold * 100
        )}% AI-generated content. Please write your feedback in your own words.`,
        422,
        {
          code: "AI_CONTENT",
          aiScore: screen.score,
          threshold: screen.threshold,
        }
      );
    }

    // Persist review + annotations transactionally.
    try {
      const review = await prisma.review.create({
        data: {
          reviewerId: user.id,
          paperId,
          comment,
          aiScore: screen.score,
          aiProvider: screen.provider,
          annotations: { create: annotations },
        },
        select: { id: true },
      });
      return json({ ok: true, reviewId: review.id }, 201);
    } catch (e) {
      // Unique constraint violation (P2002) => a concurrent duplicate review.
      // The DB unique index is the real guarantee against double-counting.
      if ((e as { code?: string })?.code === "P2002") {
        return error("You have already reviewed this paper.", 409, {
          code: "ALREADY_REVIEWED",
        });
      }
      throw e;
    }
  } catch (err) {
    return handleRouteError(err);
  }
}

// GET /api/reviews -> reviews the current user has completed (as reviewer).
export async function GET() {
  try {
    const user = await requireUser();
    const reviews = await prisma.review.findMany({
      where: { reviewerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        comment: true,
        createdAt: true,
        paper: {
          select: {
            id: true,
            title: true,
            category: true,
            specialty: true,
            educationLevel: true,
          },
        },
        _count: { select: { annotations: true } },
      },
    });
    return json({ reviews });
  } catch (err) {
    return handleRouteError(err);
  }
}
