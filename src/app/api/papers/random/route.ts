import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { pickRandomMatch } from "@/lib/matching";
import { json, handleRouteError } from "@/lib/http";

type AnonPaper = {
  id: string;
  title: string;
  category: string;
  specialty: string;
  educationLevel: string;
  paperType: string;
  feedbackWanted: string | null;
  text: string;
  wordCount: number;
  createdAt: Date;
  matchScore: number | null;
};

// GET /api/papers/random?exclude=<paperId>
// Signed-in: returns the best-matched paper for this reviewer.
// Signed-out: returns a recent paper so visitors can start reviewing before
// creating an account. Author identity is never included either way.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const exclude = req.nextUrl.searchParams.get("exclude") ?? undefined;

    let paper: AnonPaper | null = null;

    if (user) {
      const matched = await pickRandomMatch(user, { excludeId: exclude });
      if (matched) paper = { ...matched, matchScore: matched.matchScore };
    } else {
      // Anonymous visitor: pick from recent papers (no personalization).
      const recent = await prisma.paper.findMany({
        where: exclude ? { id: { not: exclude } } : undefined,
        orderBy: { createdAt: "desc" },
        take: 25,
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
        },
      });
      if (recent.length > 0) {
        const pick = recent[Math.floor(Math.random() * recent.length)];
        const fullPaper = await prisma.paper.findUnique({
          where: { id: pick.id },
          select: { text: true },
        });
        if (fullPaper) {
          paper = { ...pick, text: fullPaper.text, matchScore: null };
        }
      }
    }

    if (!paper) return json({ paper: null });
    return json({
      paper: {
        ...paper,
        matchScore: paper.matchScore == null ? null : Math.round(paper.matchScore),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
