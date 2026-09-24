// Atom grade engine — pure, deterministic, no Prisma imports so it can be unit-tested.
// Supports points-based and weighted-category grading, letter/GPA mapping, the
// "what do I need?" required-score solver, and cumulative GPA.

import { GPA_WEIGHT_BUMP, type GradingSystem, type GpaScale, type GpaWeight } from "./types";

// Standard US +/- letter scale.
const LETTER_TABLE: { min: number; letter: string; gpa: number }[] = [
  { min: 97, letter: "A+", gpa: 4.0 },
  { min: 93, letter: "A", gpa: 4.0 },
  { min: 90, letter: "A-", gpa: 3.7 },
  { min: 87, letter: "B+", gpa: 3.3 },
  { min: 83, letter: "B", gpa: 3.0 },
  { min: 80, letter: "B-", gpa: 2.7 },
  { min: 77, letter: "C+", gpa: 2.3 },
  { min: 73, letter: "C", gpa: 2.0 },
  { min: 70, letter: "C-", gpa: 1.7 },
  { min: 67, letter: "D+", gpa: 1.3 },
  { min: 63, letter: "D", gpa: 1.0 },
  { min: 60, letter: "D-", gpa: 0.7 },
  { min: 0, letter: "F", gpa: 0.0 },
];

export function letterFromPercent(pct: number): { letter: string; gpa: number } {
  for (const row of LETTER_TABLE) if (pct >= row.min) return { letter: row.letter, gpa: row.gpa };
  return { letter: "F", gpa: 0 };
}

// Minimum percent required to earn a given letter grade (for goal presets).
export function percentForLetterGoal(letter: string): number | null {
  const row = LETTER_TABLE.find((r) => r.letter.toLowerCase() === letter.trim().toLowerCase());
  return row ? row.min : null;
}

export interface GradeItemInput {
  categoryId: string | null;
  pointsEarned: number | null;
  pointsPossible: number | null;
}

export interface GradeCategoryInput {
  id: string;
  name: string;
  weight: number; // percent points, e.g. 50 for 50%
  dropLowest: number;
}

export interface ClassGradeInput {
  gradingSystem: GradingSystem;
  categories: GradeCategoryInput[];
  items: GradeItemInput[];
}

export interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  weight: number;
  effectiveWeight: number; // 0-100, re-normalized over categories that have grades
  percent: number | null;
  earned: number;
  possible: number;
  count: number;
}

export interface ClassGradeResult {
  percent: number | null;
  letter: string | null;
  gpa: number | null;
  breakdown: CategoryBreakdown[];
  gradedCount: number;
  uncategorizedGradedCount: number;
}

function isGraded(it: GradeItemInput): it is { categoryId: string | null; pointsEarned: number; pointsPossible: number } {
  return (
    it.pointsEarned !== null &&
    it.pointsEarned !== undefined &&
    it.pointsPossible !== null &&
    it.pointsPossible !== undefined &&
    it.pointsPossible > 0
  );
}

function round(n: number, dp = 2): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Percent for one category's items, applying "drop lowest N" by per-item percentage.
export function computeCategoryPercent(
  items: { pointsEarned: number; pointsPossible: number }[],
  dropLowest: number,
): { percent: number | null; earned: number; possible: number; count: number } {
  if (items.length === 0) return { percent: null, earned: 0, possible: 0, count: 0 };
  let kept = items;
  if (dropLowest > 0 && items.length > dropLowest) {
    kept = [...items]
      .sort((a, b) => a.pointsEarned / a.pointsPossible - b.pointsEarned / b.pointsPossible)
      .slice(dropLowest);
  }
  const earned = kept.reduce((s, i) => s + i.pointsEarned, 0);
  const possible = kept.reduce((s, i) => s + i.pointsPossible, 0);
  if (possible <= 0) return { percent: null, earned, possible, count: kept.length };
  return { percent: (earned / possible) * 100, earned, possible, count: kept.length };
}

export function computeClassGrade(input: ClassGradeInput): ClassGradeResult {
  const graded = input.items.filter(isGraded);
  const definedIds = new Set(input.categories.map((c) => c.id));
  const uncategorized = graded.filter((g) => !g.categoryId || !definedIds.has(g.categoryId));

  // ---- Points-based: overall is total earned / total possible ----
  if (input.gradingSystem === "points") {
    const totalPossible = graded.reduce((s, i) => s + i.pointsPossible, 0);
    const totalEarned = graded.reduce((s, i) => s + i.pointsEarned, 0);
    const percent = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : null;

    // Informational per-category breakdown; effectiveWeight = share of total points.
    const breakdown: CategoryBreakdown[] = input.categories.map((cat) => {
      const catItems = graded.filter((g) => g.categoryId === cat.id);
      const cp = computeCategoryPercent(catItems, 0);
      return {
        categoryId: cat.id,
        name: cat.name,
        weight: cat.weight,
        effectiveWeight: totalPossible > 0 ? round((cp.possible / totalPossible) * 100) : 0,
        percent: cp.percent === null ? null : round(cp.percent),
        earned: round(cp.earned),
        possible: round(cp.possible),
        count: cp.count,
      };
    });
    if (uncategorized.length > 0) {
      const cp = computeCategoryPercent(uncategorized, 0);
      breakdown.push({
        categoryId: null,
        name: "Uncategorized",
        weight: 0,
        effectiveWeight: totalPossible > 0 ? round((cp.possible / totalPossible) * 100) : 0,
        percent: cp.percent === null ? null : round(cp.percent),
        earned: round(cp.earned),
        possible: round(cp.possible),
        count: cp.count,
      });
    }
    const lg = percent === null ? null : letterFromPercent(percent);
    return {
      percent: percent === null ? null : round(percent),
      letter: lg ? lg.letter : null,
      gpa: lg ? lg.gpa : null,
      breakdown,
      gradedCount: graded.length,
      uncategorizedGradedCount: uncategorized.length,
    };
  }

  // ---- Weighted categories ----
  const rows: CategoryBreakdown[] = [];
  for (const cat of input.categories) {
    const catItems = graded
      .filter((g) => g.categoryId === cat.id)
      .map((g) => ({ pointsEarned: g.pointsEarned, pointsPossible: g.pointsPossible }));
    const cp = computeCategoryPercent(catItems, cat.dropLowest);
    rows.push({
      categoryId: cat.id,
      name: cat.name,
      weight: cat.weight,
      effectiveWeight: 0,
      percent: cp.percent,
      earned: cp.earned,
      possible: cp.possible,
      count: cp.count,
    });
  }

  // Leftover weight (if defined weights don't reach 100) can absorb uncategorized items.
  const definedWeightSum = input.categories.reduce((s, c) => s + (c.weight || 0), 0);
  const leftover = Math.max(0, 100 - definedWeightSum);
  if (uncategorized.length > 0) {
    const cp = computeCategoryPercent(
      uncategorized.map((g) => ({ pointsEarned: g.pointsEarned, pointsPossible: g.pointsPossible })),
      0,
    );
    rows.push({
      categoryId: null,
      name: "Uncategorized",
      weight: leftover,
      effectiveWeight: 0,
      percent: cp.percent,
      earned: cp.earned,
      possible: cp.possible,
      count: cp.count,
    });
  }

  const active = rows.filter((r) => r.percent !== null && r.weight > 0);
  const activeWeightSum = active.reduce((s, r) => s + r.weight, 0);

  let percent: number | null = null;
  if (activeWeightSum > 0) {
    let acc = 0;
    for (const r of active) {
      const eff = (r.weight / activeWeightSum) * 100;
      r.effectiveWeight = round(eff);
      acc += (r.weight / activeWeightSum) * (r.percent as number);
    }
    percent = acc;
  }

  // Normalize numbers for output.
  for (const r of rows) {
    r.percent = r.percent === null ? null : round(r.percent);
    r.earned = round(r.earned);
    r.possible = round(r.possible);
  }

  const lg = percent === null ? null : letterFromPercent(percent);
  return {
    percent: percent === null ? null : round(percent),
    letter: lg ? lg.letter : null,
    gpa: lg ? lg.gpa : null,
    breakdown: rows,
    gradedCount: graded.length,
    uncategorizedGradedCount: uncategorized.length,
  };
}

// ---------------------------------------------------------------------------
// "What do I need?" — required score on an upcoming assessment to hit a target.
// ---------------------------------------------------------------------------

export interface RequiredScoreInput {
  gradingSystem: GradingSystem;
  categories: GradeCategoryInput[];
  items: GradeItemInput[];
  targetPercent: number; // desired overall %
  assessmentCategoryId: string | null; // weighted mode: which category it counts in
  assessmentPoints: number; // points possible on the upcoming assessment (W)
}

export interface RequiredScoreResult {
  requiredPoints: number;
  requiredPercent: number;
  achievable: boolean;
  alreadyMet: boolean;
  impossible: boolean;
  projectedIfPerfect: number;
  projectedIfZero: number;
  explanation: string;
}

export function requiredScore(input: RequiredScoreInput): RequiredScoreResult {
  const W = input.assessmentPoints;
  const T = input.targetPercent / 100; // fraction
  const graded = input.items.filter(isGraded);

  const build = (requiredPoints: number, ifPerfect: number, ifZero: number, note: string): RequiredScoreResult => {
    const requiredPercent = W > 0 ? (requiredPoints / W) * 100 : 0;
    const alreadyMet = requiredPoints <= 0;
    const impossible = requiredPoints > W + 1e-9;
    return {
      requiredPoints: round(requiredPoints, 2),
      requiredPercent: round(requiredPercent, 2),
      achievable: !alreadyMet && !impossible,
      alreadyMet,
      impossible,
      projectedIfPerfect: round(ifPerfect, 2),
      projectedIfZero: round(ifZero, 2),
      explanation: note,
    };
  };

  if (W <= 0) {
    return build(0, 0, 0, "Enter the point value of the upcoming assessment.");
  }

  // ---- Points-based ----
  if (input.gradingSystem === "points" || !input.assessmentCategoryId) {
    const P = graded.reduce((s, i) => s + i.pointsPossible, 0);
    const E = graded.reduce((s, i) => s + i.pointsEarned, 0);
    const x = T * (P + W) - E;
    const ifPerfect = ((E + W) / (P + W)) * 100;
    const ifZero = (E / (P + W)) * 100;
    const note =
      `Right now you have ${round(E)}/${round(P)} points. To reach ${round(input.targetPercent)}% overall after a ` +
      `${round(W)}-point assessment, you need (${round(input.targetPercent)}% x ${round(P + W)}) - ${round(E)} = ` +
      `${round(x)} points on it — that's ${round((x / W) * 100)}%.`;
    return build(x, ifPerfect, ifZero, note);
  }

  // ---- Weighted ----
  const target = input.categories.find((c) => c.id === input.assessmentCategoryId);
  const wC = target ? target.weight : 0;

  // Current per-category state.
  const catState = input.categories.map((cat) => {
    const catItems = graded.filter((g) => g.categoryId === cat.id);
    const cp = computeCategoryPercent(
      catItems.map((g) => ({ pointsEarned: g.pointsEarned, pointsPossible: g.pointsPossible })),
      cat.dropLowest,
    );
    return { cat, cp };
  });

  const targetHasItems = catState.find((s) => s.cat.id === input.assessmentCategoryId)?.cp.count ?? 0;
  // earned/possible for the target category are taken WITHOUT drop so the new
  // assessment enters cleanly (drop-lowest is ignored for the target category here).
  const targetRaw = graded
    .filter((g) => g.categoryId === input.assessmentCategoryId)
    .reduce((acc, g) => ({ earned: acc.earned + g.pointsEarned, possible: acc.possible + g.pointsPossible }), {
      earned: 0,
      possible: 0,
    });

  if (wC <= 0) {
    // Assessment's category has no weight -> can't move the grade.
    return build(0, 0, 0, "That category has 0% weight, so this assessment can't change your overall grade.");
  }

  // Active categories AFTER adding the assessment (target becomes active).
  const activeOthers = catState.filter(
    (s) => s.cat.id !== input.assessmentCategoryId && s.cp.percent !== null && s.cat.weight > 0,
  );
  const D = activeOthers.reduce((s, o) => s + o.cat.weight, 0) + wC; // denominator (weights)
  const othersNumerator = activeOthers.reduce((s, o) => s + o.cat.weight * ((o.cp.percent as number) / 100), 0);

  // overall(x) = [ othersNumerator + wC * (earned + x)/(possible + W) ] / D  == T
  // Solve for x:
  const R = T * D - othersNumerator; // must equal wC * (earned+x)/(possible+W)
  const x = (R * (targetRaw.possible + W)) / wC - targetRaw.earned;

  const overallAt = (score: number) => {
    const catFrac = (targetRaw.earned + score) / (targetRaw.possible + W);
    return ((othersNumerator + wC * catFrac) / D) * 100;
  };
  const ifPerfect = overallAt(W);
  const ifZero = overallAt(0);

  const note =
    `Weighted: your other graded categories contribute ${round(othersNumerator * 100 / D, 2)}% toward the ` +
    `${round(input.targetPercent)}% target. The ${target ? target.name : "assessment"} category is worth ` +
    `${round(wC)}%${targetHasItems ? "" : " (new)"}, so you need ${round(x)} of ${round(W)} points ` +
    `(${round((x / W) * 100)}%) on this assessment.`;
  return build(x, ifPerfect, ifZero, note);
}

// ---------------------------------------------------------------------------
// Cumulative GPA
// ---------------------------------------------------------------------------

export interface GpaClassInput {
  percent: number | null;
  credits: number;
  includeInGpa: boolean;
  gpaWeight: GpaWeight;
}

export function classGpaValue(percent: number, scale: GpaScale, weight: GpaWeight): number | null {
  if (scale === "none" || scale === "percent") return null;
  const base = letterFromPercent(percent).gpa;
  if (scale === "5.0") {
    const bumped = base <= 0 ? 0 : base + GPA_WEIGHT_BUMP[weight];
    return Math.min(5, Math.max(0, bumped));
  }
  return base; // 4.0 unweighted
}

export function cumulativeGpa(classes: GpaClassInput[], scale: GpaScale): number | null {
  if (scale === "none" || scale === "percent") return null;
  let totalPoints = 0;
  let totalCredits = 0;
  for (const c of classes) {
    if (!c.includeInGpa || c.percent === null) continue;
    const credits = c.credits > 0 ? c.credits : 1;
    const gpa = classGpaValue(c.percent, scale, c.gpaWeight);
    if (gpa === null) continue;
    totalPoints += gpa * credits;
    totalCredits += credits;
  }
  if (totalCredits === 0) return null;
  return round(totalPoints / totalCredits, 3);
}
