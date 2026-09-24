import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, getUserId, notFound, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import type { GpaWeight, GradingSystem } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GRADING: GradingSystem[] = ["weighted", "points"];
const GPA_WEIGHTS: GpaWeight[] = ["regular", "honors", "ap"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomClass.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();

  const b = await body(req);
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const n = str(b.name, 120);
    if (!n) return bad("Class name is required.");
    data.name = n;
  }
  if (b.teacher !== undefined) data.teacher = str(b.teacher, 120);
  if (b.period !== undefined) data.period = str(b.period, 60);
  if (b.schoolYear !== undefined) data.schoolYear = str(b.schoolYear, 40);
  if (b.term !== undefined) data.term = str(b.term, 40);
  if (b.credits !== undefined) data.credits = num(b.credits) ?? 1;
  if (b.gradingSystem !== undefined) data.gradingSystem = oneOf(b.gradingSystem, GRADING, "weighted");
  if (b.color !== undefined) data.color = str(b.color, 20) ?? "#356d97";
  if (b.includeInGpa !== undefined) data.includeInGpa = bool(b.includeInGpa, true);
  if (b.gpaWeight !== undefined) data.gpaWeight = oneOf(b.gpaWeight, GPA_WEIGHTS, "regular");
  if (b.importedGradePercent !== undefined) data.importedGradePercent = num(b.importedGradePercent);
  if (b.importedGradeLetter !== undefined) data.importedGradeLetter = str(b.importedGradeLetter, 10);
  if (b.archived !== undefined) data.archived = bool(b.archived);
  if (b.sortOrder !== undefined) data.sortOrder = Math.trunc(num(b.sortOrder) ?? 0);

  const cls = await prisma.atomClass.update({
    where: { id: params.id },
    data,
    include: { categories: { orderBy: { sortOrder: "asc" } } },
  });
  return ok({ class: cls });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomClass.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  // Remove the class's assignments too (they would otherwise be orphaned).
  await prisma.atomAssignment.deleteMany({ where: { userId: uid, classId: params.id } });
  await prisma.atomClass.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
