import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { ASSIGNMENT_TYPES, WORK_STATUSES, type AssignmentType, type WorkStatus } from "@/lib/atom/types";
import { recordSnapshot } from "@/lib/atom/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = { userId: uid };
  const classId = searchParams.get("classId");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  if (classId) where.classId = classId;
  if (status) where.status = status;
  if (type) where.type = type;
  const assignments = await prisma.atomAssignment.findMany({
    where,
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
  return ok({ assignments });
}

// Verify an optional class + category belong to the user, returning normalized ids.
async function resolveClassCategory(uid: string, classId: string | null, categoryId: string | null) {
  let cid: string | null = null;
  let catId: string | null = null;
  if (classId) {
    const cls = await prisma.atomClass.findFirst({ where: { id: classId, userId: uid }, select: { id: true } });
    if (cls) cid = cls.id;
  }
  if (categoryId && cid) {
    const cat = await prisma.atomCategory.findFirst({ where: { id: categoryId, classId: cid }, select: { id: true } });
    if (cat) catId = cat.id;
  }
  return { cid, catId };
}

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const name = str(b.name, 200);
  if (!name) return bad("Assignment name is required.");

  const { cid, catId } = await resolveClassCategory(uid, str(b.classId, 40), str(b.categoryId, 40));

  const created = await prisma.atomAssignment.create({
    data: {
      userId: uid,
      classId: cid,
      categoryId: catId,
      name,
      type: oneOf<AssignmentType>(b.type, ASSIGNMENT_TYPES, "homework"),
      description: str(b.description, 4000),
      dueAt: dt(b.dueAt),
      hasTime: bool(b.hasTime),
      pointsEarned: num(b.pointsEarned),
      pointsPossible: num(b.pointsPossible),
      status: oneOf<WorkStatus>(b.status, WORK_STATUSES, "not_started"),
      notes: str(b.notes, 4000),
    },
  });
  if (cid) await recordSnapshot(uid, cid);
  return ok({ assignment: created });
}
