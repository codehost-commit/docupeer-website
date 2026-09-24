import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, dt, getUserId, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { ASSIGNMENT_TYPES, WORK_STATUSES, type AssignmentType, type WorkStatus } from "@/lib/atom/types";
import { recordSnapshot } from "@/lib/atom/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Step 5-6 of import: save the reviewed rows. Rows carry an optional categoryId
// (chosen in the review UI) or a category name to match against the class.
export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const classId = str(b.classId, 40);
  const rows = Array.isArray(b.rows) ? (b.rows as Record<string, unknown>[]) : [];
  if (!classId) return bad("Choose a class to import into.");
  if (rows.length === 0) return bad("There are no rows to import.");

  const cls = await prisma.atomClass.findFirst({
    where: { id: classId, userId: uid },
    include: { categories: true },
  });
  if (!cls) return bad("Class not found.", 404);

  const catByName = new Map<string, string>(cls.categories.map((c) => [c.name.toLowerCase(), c.id]));
  const catById = new Set<string>(cls.categories.map((c) => c.id));

  const data = rows.slice(0, 500).map((r) => {
    let categoryId: string | null = null;
    const rawCatId = str(r.categoryId, 40);
    if (rawCatId && catById.has(rawCatId)) categoryId = rawCatId;
    else {
      const nm = str(r.category, 80);
      if (nm && catByName.has(nm.toLowerCase())) categoryId = catByName.get(nm.toLowerCase())!;
    }
    return {
      userId: uid,
      classId,
      categoryId,
      name: (str(r.name, 200) ?? "Imported item").slice(0, 200),
      type: oneOf<AssignmentType>(r.type, ASSIGNMENT_TYPES, "homework"),
      pointsEarned: num(r.pointsEarned),
      pointsPossible: num(r.pointsPossible),
      dueAt: dt(r.dueDate),
      hasTime: false,
      status: oneOf<WorkStatus>(r.status, WORK_STATUSES, "not_started"),
    };
  });

  await prisma.atomAssignment.createMany({ data });
  await recordSnapshot(uid, classId);
  return ok({ ok: true, imported: data.length });
}
