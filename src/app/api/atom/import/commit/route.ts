import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, dt, getUserId, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { ASSIGNMENT_TYPES, WORK_STATUSES, type AssignmentType, type WorkStatus } from "@/lib/atom/types";
import { recordSnapshot } from "@/lib/atom/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLORS = ["#356d97", "#7c5cbf", "#4f8a5f", "#a87717", "#b3455e", "#2f6288"];
type RawRow = Record<string, unknown>;

function assignmentData(uid: string, classId: string, rows: RawRow[], categories: { id: string; name: string }[]) {
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const catById = new Set(categories.map((c) => c.id));
  return rows.slice(0, 500).flatMap((r) => {
    const name = str(r.name, 200);
    if (!name) return [];
    let categoryId: string | null = null;
    const rawCatId = str(r.categoryId, 40);
    if (rawCatId && catById.has(rawCatId)) categoryId = rawCatId;
    else {
      const category = str(r.category, 80);
      if (category && catByName.has(category.toLowerCase())) categoryId = catByName.get(category.toLowerCase())!;
    }
    return [{
      userId: uid,
      classId,
      categoryId,
      name,
      type: oneOf<AssignmentType>(r.type, ASSIGNMENT_TYPES, "homework"),
      pointsEarned: num(r.pointsEarned),
      pointsPossible: num(r.pointsPossible),
      dueAt: dt(r.dueDate),
      hasTime: false,
      status: oneOf<WorkStatus>(r.status, WORK_STATUSES, "not_started"),
    }];
  });
}

// Save the reviewed import. A report can create multiple classes; the original
// class-scoped assignment import remains supported for existing gradebooks.
export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const classId = str(b.classId, 40);
  const rows = Array.isArray(b.rows) ? (b.rows as RawRow[]) : [];
  const reportClasses = Array.isArray(b.classes) ? (b.classes as RawRow[]) : [];

  if (reportClasses.length > 0) {
    const importedIds: string[] = [];
    let imported = 0;
    await prisma.$transaction(async (tx) => {
      const count = await tx.atomClass.count({ where: { userId: uid } });
      for (const [index, raw] of reportClasses.slice(0, 50).entries()) {
        const name = str(raw.name, 120);
        if (!name) continue;
        const rawCategories = Array.isArray(raw.categories) ? (raw.categories as RawRow[]) : [];
        const cls = await tx.atomClass.create({
          data: {
            userId: uid,
            name,
            teacher: str(raw.teacher, 120),
            period: str(raw.period, 60),
            schoolYear: str(raw.schoolYear, 40),
            term: str(raw.term, 40),
            credits: num(raw.credits) ?? 1,
            gradingSystem: raw.gradingSystem === "weighted" ? "weighted" : "points",
            color: str(raw.color, 20) ?? COLORS[(count + index) % COLORS.length],
            includeInGpa: raw.includeInGpa !== false,
            gpaWeight: raw.gpaWeight === "honors" || raw.gpaWeight === "ap" ? raw.gpaWeight : "regular",
            importedGradePercent: num(raw.importedGradePercent) ?? num(raw.percent),
            importedGradeLetter: str(raw.importedGradeLetter, 10) ?? str(raw.letter, 10),
            sortOrder: count + index,
            categories: rawCategories.length > 0 ? {
              create: rawCategories.slice(0, 20).map((category, categoryIndex) => ({
                name: str(category.name, 80) ?? `Category ${categoryIndex + 1}`,
                weight: Math.max(0, num(category.weight) ?? 0),
                dropLowest: Math.max(0, Math.trunc(num(category.dropLowest) ?? 0)),
                sortOrder: categoryIndex,
              })),
            } : undefined,
          },
          include: { categories: true },
        });
        importedIds.push(cls.id);
        const classRows = Array.isArray(raw.rows) ? (raw.rows as RawRow[]) : [];
        const data = assignmentData(uid, cls.id, classRows, cls.categories);
        if (data.length > 0) {
          await tx.atomAssignment.createMany({ data });
          imported += data.length;
        }
      }
    });
    for (const id of importedIds) await recordSnapshot(uid, id);
    return ok({ ok: true, imported, importedClasses: importedIds.length });
  }

  if (!classId) return bad("Choose a class to import into.");
  if (rows.length === 0) return bad("There are no rows to import.");
  const cls = await prisma.atomClass.findFirst({ where: { id: classId, userId: uid }, include: { categories: true } });
  if (!cls) return bad("Class not found.", 404);
  const data = assignmentData(uid, classId, rows, cls.categories);
  if (data.length === 0) return bad("There are no valid rows to import.");
  await prisma.atomAssignment.createMany({ data });
  await recordSnapshot(uid, classId);
  return ok({ ok: true, imported: data.length, importedClasses: 0 });
}
