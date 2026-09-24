import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, notFound, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { ASSIGNMENT_TYPES, WORK_STATUSES, type AssignmentType, type WorkStatus } from "@/lib/atom/types";
import { recordSnapshot } from "@/lib/atom/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomAssignment.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();

  const b = await body(req);
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const n = str(b.name, 200);
    if (!n) return bad("Assignment name is required.");
    data.name = n;
  }
  if (b.classId !== undefined) {
    const cid = str(b.classId, 40);
    if (cid) {
      const cls = await prisma.atomClass.findFirst({ where: { id: cid, userId: uid }, select: { id: true } });
      data.classId = cls ? cls.id : null;
      if (!cls) data.categoryId = null;
    } else {
      data.classId = null;
      data.categoryId = null;
    }
  }
  if (b.categoryId !== undefined) {
    const catId = str(b.categoryId, 40);
    const targetClass = (data.classId as string | undefined) ?? existing.classId;
    if (catId && targetClass) {
      const cat = await prisma.atomCategory.findFirst({ where: { id: catId, classId: targetClass }, select: { id: true } });
      data.categoryId = cat ? cat.id : null;
    } else {
      data.categoryId = null;
    }
  }
  if (b.type !== undefined) data.type = oneOf<AssignmentType>(b.type, ASSIGNMENT_TYPES, "homework");
  if (b.description !== undefined) data.description = str(b.description, 4000);
  if (b.dueAt !== undefined) data.dueAt = dt(b.dueAt);
  if (b.hasTime !== undefined) data.hasTime = bool(b.hasTime);
  if (b.pointsEarned !== undefined) data.pointsEarned = num(b.pointsEarned);
  if (b.pointsPossible !== undefined) data.pointsPossible = num(b.pointsPossible);
  if (b.status !== undefined) data.status = oneOf<WorkStatus>(b.status, WORK_STATUSES, "not_started");
  if (b.notes !== undefined) data.notes = str(b.notes, 4000);

  const updated = await prisma.atomAssignment.update({ where: { id: params.id }, data });
  const affected = new Set<string>();
  if (existing.classId) affected.add(existing.classId);
  if (updated.classId) affected.add(updated.classId);
  for (const cid of affected) await recordSnapshot(uid, cid);
  return ok({ assignment: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomAssignment.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  await prisma.atomAssignment.delete({ where: { id: params.id } });
  if (existing.classId) await recordSnapshot(uid, existing.classId);
  return ok({ ok: true });
}
