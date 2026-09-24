import "server-only";
import { prisma } from "@/lib/db";
import { computeClassGrade } from "./grades";
import type { GradingSystem } from "./types";

// Recompute a class's current grade and append a history snapshot when it changes.
// Called after any assignment mutation. Keeps at most one snapshot per (class, day).
export async function recordSnapshot(userId: string, classId: string): Promise<void> {
  const cls = await prisma.atomClass.findFirst({
    where: { id: classId, userId },
    include: { categories: true, assignments: true },
  });
  if (!cls) return;

  const grade = computeClassGrade({
    gradingSystem: cls.gradingSystem as GradingSystem,
    categories: cls.categories.map((c) => ({ id: c.id, name: c.name, weight: c.weight, dropLowest: c.dropLowest })),
    items: cls.assignments.map((a) => ({
      categoryId: a.categoryId,
      pointsEarned: a.pointsEarned,
      pointsPossible: a.pointsPossible,
    })),
  });
  if (grade.percent === null) return;

  const last = await prisma.atomGradeSnapshot.findFirst({
    where: { classId },
    orderBy: { capturedAt: "desc" },
  });

  // Skip if unchanged (within 0.01%).
  if (last && Math.abs(last.percent - grade.percent) < 0.01) return;

  // Collapse multiple changes on the same calendar day into one row.
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  if (last && last.capturedAt >= startOfDay) {
    await prisma.atomGradeSnapshot.update({
      where: { id: last.id },
      data: { percent: grade.percent, letter: grade.letter, capturedAt: new Date() },
    });
    return;
  }

  await prisma.atomGradeSnapshot.create({
    data: { userId, classId, percent: grade.percent, letter: grade.letter },
  });
}
