// Paper matching / recommendation engine.
//
// Goal: route each paper to reviewers who understand the subject and sit at an
// appropriate educational/professional level, favoring appropriately qualified
// reviewers. without exposing any author personal information.

import { EDUCATION_RANK } from "./constants";
import { prisma } from "./db";
import type { SessionUser } from "./auth";
import type { Prisma } from "@prisma/client";

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

type MatchedPaperPreview = Omit<MatchedPaper, "text"> & {
  reviewCount: number;
};

const PAPER_META_SELECT = {
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
} satisfies Prisma.PaperSelect;

type PaperMetaRow = Prisma.PaperGetPayload<{
  select: typeof PAPER_META_SELECT;
}>;

const MIN_CANDIDATE_WINDOW = 120;
const CANDIDATE_MULTIPLIER = 10;

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

async function getReviewedPaperIds(reviewerId: string): Promise<string[]> {
  const reviewed = await prisma.review.findMany({
    where: { reviewerId },
    select: { paperId: true },
  });
  return reviewed.map((r: { paperId: string }) => r.paperId);
}

async function fetchCandidateWindow(
  where: Prisma.PaperWhereInput,
  take: number
): Promise<PaperMetaRow[]> {
  const count = await prisma.paper.count({ where });
  if (count === 0) return [];

  const windowSize = Math.min(take, count);
  const skip =
    count > windowSize ? Math.floor(Math.random() * (count - windowSize + 1)) : 0;

  return prisma.paper.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: windowSize,
    select: PAPER_META_SELECT,
  });
}

function rankCandidateMetas(
  reviewer: SessionUser,
  candidates: PaperMetaRow[],
  limit: number
): MatchedPaperPreview[] {
  const seen = new Set<string>();
  const unique = candidates.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return unique
    .map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      specialty: p.specialty,
      educationLevel: p.educationLevel,
      paperType: p.paperType,
      feedbackWanted: p.feedbackWanted,
      wordCount: p.wordCount,
      createdAt: p.createdAt,
      matchScore: scoreMatch(reviewer, p),
      reviewCount: p._count.reviews,
    }))
    .sort(
      (a, b) =>
        b.matchScore - a.matchScore ||
        a.reviewCount - b.reviewCount ||
        b.createdAt.getTime() - a.createdAt.getTime()
    )
    .slice(0, limit);
}

function withText(
  match: MatchedPaperPreview,
  text: string
): MatchedPaper {
  const { reviewCount, ...paper } = match;
  void reviewCount;
  return { ...paper, text };
}

async function fetchFullMatch(
  match: MatchedPaperPreview
): Promise<MatchedPaper | null> {
  const row = await prisma.paper.findUnique({
    where: { id: match.id },
    select: { text: true },
  });
  if (!row) return null;
  return withText(match, row.text);
}

async function findMatchPreviewsForReviewer(
  reviewer: SessionUser,
  opts: { limit?: number; excludeId?: string } = {}
): Promise<MatchedPaperPreview[]> {
  const limit = opts.limit ?? 20;
  const reviewedIds = await getReviewedPaperIds(reviewer.id);
  const excludedIds = [...reviewedIds, opts.excludeId].filter(
    (id): id is string => Boolean(id)
  );
  const idFilter =
    excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {};
  const baseWhere: Prisma.PaperWhereInput = {
    authorId: { not: reviewer.id },
    ...idFilter,
  };
  const candidateWindow = Math.max(
    MIN_CANDIDATE_WINDOW,
    limit * CANDIDATE_MULTIPLIER
  );

  const focused = await fetchCandidateWindow(
    { ...baseWhere, category: reviewer.expertiseCategory },
    candidateWindow
  );
  const remaining = candidateWindow - focused.length;
  const fallback =
    remaining > 0
      ? await fetchCandidateWindow(baseWhere, remaining)
      : [];

  return rankCandidateMetas(reviewer, [...focused, ...fallback], limit);
}

// Find candidate papers this reviewer may review, ranked by fit.
// Excludes the reviewer's own papers and any paper they've already reviewed.
export async function findMatchesForReviewer(
  reviewer: SessionUser,
  opts: { limit?: number } = {}
): Promise<MatchedPaper[]> {
  const previews = await findMatchPreviewsForReviewer(reviewer, opts);
  if (previews.length === 0) return [];

  const textRows = await prisma.paper.findMany({
    where: { id: { in: previews.map((p) => p.id) } },
    select: { id: true, text: true },
  });
  const textById = new Map(textRows.map((p) => [p.id, p.text]));

  return previews.flatMap((preview) => {
    const text = textById.get(preview.id);
    return text ? [withText(preview, text)] : [];
  });
}

// Pick the single best available paper for the reviewer, with light
// randomization among the top matches so "Randomize" feels varied while still
// favoring appropriately qualified matches. Papers with the fewest existing
// reviews are preferred within the top tier so feedback spreads out.
export async function pickRandomMatch(
  reviewer: SessionUser,
  opts: { excludeId?: string } = {}
): Promise<MatchedPaper | null> {
  let pool = await findMatchPreviewsForReviewer(reviewer, {
    limit: 30,
    excludeId: opts.excludeId,
  });

  if (pool.length === 0 && opts.excludeId) {
    // Fall back to including the excluded paper if it's the only option.
    pool = await findMatchPreviewsForReviewer(reviewer, { limit: 30 });
  }
  if (pool.length === 0) return null;

  // Take the top tier (best-fitting papers) and pick randomly among them.
  const topTier = pool.slice(0, Math.min(6, pool.length));
  const shuffled = [...topTier].sort(() => Math.random() - 0.5);

  for (const candidate of shuffled) {
    const match = await fetchFullMatch(candidate);
    if (match) return match;
  }

  return null;
}
