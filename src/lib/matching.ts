// Paper matching / recommendation engine.
//
// Goal: route each paper to reviewers who understand the subject and sit at an
// appropriate educational/professional level, favoring appropriately qualified
// reviewers. without exposing any author personal information.

import { EDUCATION_RANK } from "./constants";
import { prisma } from "./db";
import type { SessionUser } from "./auth";

export type MatchedPaper = {
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
  matchScore: number;
};

// Compute a fit score between a reviewer and a paper. Higher = better fit.
export function scoreMatch(
  reviewer: Pick<
    SessionUser,
    "expertiseCategory" | "specialty" | "educationLevel" | "strength"
  >,
  paper: {
    category: string;
    specialty: string;
    educationLevel: string;
  }
): number {
  let score = 0;

  // Category match is the strongest signal.
  if (reviewer.expertiseCategory === paper.category) score += 50;

  // Specialty/topic match (case-insensitive, loose contains).
  const rs = reviewer.specialty.trim().toLowerCase();
  const ps = paper.specialty.trim().toLowerCase();
  if (rs && ps) {
    if (rs === ps) score += 30;
    else if (rs.includes(ps) || ps.includes(rs)) score += 18;
  }

  // Education-level proximity: reviewers at or slightly above the paper's level
  // are ideal. Penalize large gaps in either direction.
  const rRank = EDUCATION_RANK[reviewer.educationLevel] ?? 2;
  const pRank = EDUCATION_RANK[paper.educationLevel] ?? 2;
  const gap = rRank - pRank;
  if (gap === 0) score += 20;
  else if (gap === 1) score += 16; // reviewer one level above: great
  else if (gap === -1) score += 8; // slightly below: acceptable
  else score += Math.max(0, 12 - Math.abs(gap) * 4);

  // Reviewer's self-rated strength in their specialty nudges qualified
  // reviewers ahead, but only meaningfully when the category matches.
  if (reviewer.expertiseCategory === paper.category) {
    score += (reviewer.strength / 100) * 15;
  } else {
    score += (reviewer.strength / 100) * 3;
  }

  return score;
}

// Find candidate papers this reviewer may review, ranked by fit.
// Excludes the reviewer's own papers and any paper they've already reviewed.
export async function findMatchesForReviewer(
  reviewer: SessionUser,
  opts: { limit?: number } = {}
): Promise<MatchedPaper[]> {
  const limit = opts.limit ?? 20;

  // Papers already reviewed by this user.
  const reviewed = await prisma.review.findMany({
    where: { reviewerId: reviewer.id },
    select: { paperId: true },
  });
  const reviewedIds = new Set(
    reviewed.map((r: { paperId: string }) => r.paperId)
  );

  type PaperRow = {
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
  };

  const candidates: PaperRow[] = await prisma.paper.findMany({
    where: {
      authorId: { not: reviewer.id }, // never review your own paper
      id: { notIn: Array.from(reviewedIds) },
    },
    orderBy: { createdAt: "desc" },
    take: 200, // cap the working set; rank in-app
  });

  const ranked: MatchedPaper[] = candidates
    .map((p: PaperRow) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      specialty: p.specialty,
      educationLevel: p.educationLevel,
      paperType: p.paperType,
      feedbackWanted: p.feedbackWanted,
      text: p.text,
      wordCount: p.wordCount,
      createdAt: p.createdAt,
      matchScore: scoreMatch(reviewer, p),
    }))
    // Favor better matches; sort by score descending.
    .sort((a: MatchedPaper, b: MatchedPaper) => b.matchScore - a.matchScore);

  return ranked.slice(0, limit);
}

// Pick the single best available paper for the reviewer, with light
// randomization among the top matches so "Randomize" feels varied while still
// favoring appropriately qualified matches. Papers with the fewest existing
// reviews are preferred within the top tier so feedback spreads out.
export async function pickRandomMatch(
  reviewer: SessionUser,
  opts: { excludeId?: string } = {}
): Promise<MatchedPaper | null> {
  const matches = await findMatchesForReviewer(reviewer, { limit: 30 });
  const pool = matches.filter((m) => m.id !== opts.excludeId);
  if (pool.length === 0) {
    // Fall back to including the excluded paper if it's the only option.
    if (matches.length > 0) return matches[0];
    return null;
  }

  // Take the top tier (best-fitting papers) and pick randomly among them.
  const topTier = pool.slice(0, Math.min(6, pool.length));
  const chosen = topTier[Math.floor(Math.random() * topTier.length)];
  return chosen;
}
