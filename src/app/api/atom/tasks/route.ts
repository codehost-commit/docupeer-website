import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { PRIORITIES, TASK_CATEGORIES, TASK_STATUSES, type Priority, type TaskCategory, type TaskStatus } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const { searchParams } = new URL(req.url);
  const where: Record<string, unknown> = { userId: uid };
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const classId = searchParams.get("classId");
  if (status) where.status = status;
  if (category) where.category = category;
  if (classId) where.classId = classId;
  const tasks = await prisma.atomTask.findMany({
    where,
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
  return ok({ tasks });
}

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const title = str(b.title, 200);
  if (!title) return bad("Task title is required.");
  let classId: string | null = null;
  const wantClass = str(b.classId, 40);
  if (wantClass) {
    const cls = await prisma.atomClass.findFirst({ where: { id: wantClass, userId: uid }, select: { id: true } });
    classId = cls ? cls.id : null;
  }
  const created = await prisma.atomTask.create({
    data: {
      userId: uid,
      classId,
      title,
      description: str(b.description, 4000),
      dueAt: dt(b.dueAt),
      hasTime: bool(b.hasTime),
      priority: oneOf<Priority>(b.priority, PRIORITIES, "medium"),
      status: oneOf<TaskStatus>(b.status, TASK_STATUSES, "not_started"),
      category: oneOf<TaskCategory>(b.category, TASK_CATEGORIES, "academic"),
      relatedType: str(b.relatedType, 20),
      relatedId: str(b.relatedId, 40),
      notes: str(b.notes, 4000),
    },
  });
  return ok({ task: created });
}
