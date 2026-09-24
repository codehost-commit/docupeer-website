import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, notFound, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { EC_TYPES, PRIORITIES, TASK_STATUSES, type EcType, type Priority, type TaskStatus } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomECDeadline.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  const b = await body(req);
  const data: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const n = str(b.name, 200);
    if (!n) return bad("Opportunity name is required.");
    data.name = n;
  }
  if (b.organization !== undefined) data.organization = str(b.organization, 160);
  if (b.type !== undefined) data.type = oneOf<EcType>(b.type, EC_TYPES, "other");
  if (b.dueAt !== undefined) data.dueAt = dt(b.dueAt);
  if (b.hasTime !== undefined) data.hasTime = bool(b.hasTime);
  if (b.priority !== undefined) data.priority = oneOf<Priority>(b.priority, PRIORITIES, "medium");
  if (b.status !== undefined) data.status = oneOf<TaskStatus>(b.status, TASK_STATUSES, "not_started");
  if (b.link !== undefined) data.link = str(b.link, 600);
  if (b.notes !== undefined) data.notes = str(b.notes, 4000);
  const updated = await prisma.atomECDeadline.update({ where: { id: params.id }, data });
  return ok({ ec: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomECDeadline.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  await prisma.atomECDeadline.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
