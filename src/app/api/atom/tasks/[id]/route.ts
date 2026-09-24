import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, notFound, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { PRIORITIES, TASK_CATEGORIES, TASK_STATUSES, type Priority, type TaskCategory, type TaskStatus } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomTask.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  const b = await body(req);
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) {
    const t = str(b.title, 200);
    if (!t) return bad("Task title is required.");
    data.title = t;
  }
  if (b.classId !== undefined) {
    const wantClass = str(b.classId, 40);
    if (wantClass) {
      const cls = await prisma.atomClass.findFirst({ where: { id: wantClass, userId: uid }, select: { id: true } });
      data.classId = cls ? cls.id : null;
    } else data.classId = null;
  }
  if (b.description !== undefined) data.description = str(b.description, 4000);
  if (b.dueAt !== undefined) data.dueAt = dt(b.dueAt);
  if (b.hasTime !== undefined) data.hasTime = bool(b.hasTime);
  if (b.priority !== undefined) data.priority = oneOf<Priority>(b.priority, PRIORITIES, "medium");
  if (b.status !== undefined) data.status = oneOf<TaskStatus>(b.status, TASK_STATUSES, "not_started");
  if (b.category !== undefined) data.category = oneOf<TaskCategory>(b.category, TASK_CATEGORIES, "academic");
  if (b.relatedType !== undefined) data.relatedType = str(b.relatedType, 20);
  if (b.relatedId !== undefined) data.relatedId = str(b.relatedId, 40);
  if (b.notes !== undefined) data.notes = str(b.notes, 4000);
  const updated = await prisma.atomTask.update({ where: { id: params.id }, data });
  return ok({ task: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomTask.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  await prisma.atomTask.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
