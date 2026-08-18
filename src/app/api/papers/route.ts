import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { validatePaper } from "@/lib/validation";
import { sanitizeLine, sanitizeText } from "@/lib/sanitize";
import { getCreditStatus } from "@/lib/credits";
import { json, error, handleRouteError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/papers -> the current user's own submitted papers (with review counts)
export async function GET() {
  try {
    const user = await requireUser();
    const papers = await prisma.paper.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        specialty: true,
        educationLevel: true,
        paperType: true,
        feedbackWanted: true,
        wordCount: true,
        createdAt: true,
        _count: { select: { reviews: true } },
      },
    });
    return json({ papers });
  } catch (err) {
    return handleRouteError(err);
  }
}

// POST /api/papers -> submit a new paper.
// Enforces (server-side): credit availability, daily limit, 350-word minimum.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const rl = rateLimit(`submit:${user.id}`, 5, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many submissions. Slow down.", 429);

    const body = await req.json().catch(() => ({}));
    const result = validatePaper(body);
    if (!result.ok) return json({ errors: result.errors }, 422);

    // Re-check credits & daily limit atomically against the DB. the client
    // cannot bypass this by tampering with its own dashboard.
    const status = await getCreditStatus(user.id);
    if (!status.nextSubmissionUnlocked) {
      return error(
        `You need ${status.reviewsNeededForNext} more completed review(s) before you can submit.`,
        403,
        { code: "NEED_REVIEWS" }
      );
    }
    if (status.submittedInLast24h) {
      return error(
        "You can only submit one paper per day. Please try again later.",
        403,
        {
          code: "DAILY_LIMIT",
          nextAvailableAt: status.nextSubmissionAvailableAt,
        }
      );
    }

    const paper = await prisma.paper.create({
      data: {
        authorId: user.id,
        title: sanitizeLine(body.title, 200),
        text: sanitizeText(body.text, 60_000),
        category: String(body.category),
        specialty: sanitizeLine(body.specialty, 120),
        educationLevel: String(body.educationLevel),
        paperType: String(body.paperType),
        feedbackWanted: body.feedbackWanted
          ? sanitizeText(body.feedbackWanted, 2_000)
          : null,
        wordCount: result.wordCount,
      },
      select: { id: true },
    });

    return json({ ok: true, paperId: paper.id }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
