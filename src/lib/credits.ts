// Submission-credit logic. This is intentionally derived purely from
// server-side counts (completed reviews, submitted papers) so a client can
// never manipulate its own credits. there is no writable "credit" field.

import { DAILY_SUBMISSION_LIMIT, REVIEWS_PER_CREDIT } from "./constants";
import { prisma } from "./db";

export type CreditStatus = {
  reviewsCompleted: number;
  papersSubmitted: number;
  reviewsReceived: number;
  // Total credits earned across all reviewing (floor(reviews / 2)).
  creditsEarned: number;
  // Credits not yet spent on a submission.
  creditsAvailable: number;
  // Progress toward the *next* credit.
  reviewsTowardNext: number; // 0..REVIEWS_PER_CREDIT
  reviewsNeededForNext: number; // reviews still required to unlock next submit
  nextSubmissionUnlocked: boolean;
  // Daily limit.
  submittedInLast24h: boolean;
  nextSubmissionAvailableAt: Date | null;
  // Final gate: can the user submit a paper right now?
  canSubmit: boolean;
};

// Pure, side-effect-free credit calculation. Extracted so the core rules can be
// unit-tested without a database. `getCreditStatus` just feeds it live counts.
export function computeCredits(input: {
  reviewsCompleted: number;
  papersSubmitted: number;
  reviewsReceived: number;
  lastPaperCreatedAt: Date | null;
  now?: Date;
}): CreditStatus {
  const { reviewsCompleted, papersSubmitted, reviewsReceived } = input;
  const now = input.now ?? new Date();

  const creditsEarned = Math.floor(reviewsCompleted / REVIEWS_PER_CREDIT);
  const creditsAvailable = Math.max(0, creditsEarned - papersSubmitted);

  const reviewsNeededTotal = (papersSubmitted + 1) * REVIEWS_PER_CREDIT;
  const reviewsNeededForNext = Math.max(0, reviewsNeededTotal - reviewsCompleted);
  const reviewsTowardNext = REVIEWS_PER_CREDIT - reviewsNeededForNext;
  const nextSubmissionUnlocked = creditsAvailable > 0;

  let submittedInLast24h = false;
  let nextSubmissionAvailableAt: Date | null = null;
  if (input.lastPaperCreatedAt) {
    const elapsed = now.getTime() - input.lastPaperCreatedAt.getTime();
    const window = 24 * 60 * 60 * 1000;
    if (elapsed < window) {
      submittedInLast24h = true;
      nextSubmissionAvailableAt = new Date(
        input.lastPaperCreatedAt.getTime() + window
      );
    }
  }

  const dailyOk = !submittedInLast24h; // DAILY_SUBMISSION_LIMIT === 1
  void DAILY_SUBMISSION_LIMIT;
  const canSubmit = nextSubmissionUnlocked && dailyOk;

  return {
    reviewsCompleted,
    papersSubmitted,
    reviewsReceived,
    creditsEarned,
    creditsAvailable,
    reviewsTowardNext,
    reviewsNeededForNext,
    nextSubmissionUnlocked,
    submittedInLast24h,
    nextSubmissionAvailableAt,
    canSubmit,
  };
}

export async function getCreditStatus(userId: string): Promise<CreditStatus> {
  const [reviewsCompleted, papersSubmitted, reviewsReceived, lastPaper] =
    await Promise.all([
      prisma.review.count({ where: { reviewerId: userId } }),
      prisma.paper.count({ where: { authorId: userId } }),
      prisma.review.count({ where: { paper: { authorId: userId } } }),
      prisma.paper.findFirst({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

  return computeCredits({
    reviewsCompleted,
    papersSubmitted,
    reviewsReceived,
    lastPaperCreatedAt: lastPaper?.createdAt ?? null,
  });
}

