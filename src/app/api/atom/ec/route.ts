import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, num, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { EC_TYPES, PRIORITIES, TASK_STATUSES, type EcType, type Priority, type TaskStatus } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const ec = await prisma.atomECDeadline.findMany({
    where: { userId: uid },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
  return ok({ ec });
}

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const name = str(b.name, 200);
  if (!name) return bad("Opportunity name is required.");
  const created = await prisma.atomECDeadline.create({
    data: {
      userId: uid,
      name,
      organization: str(b.organization, 160),
      type: oneOf<EcType>(b.type, EC_TYPES, "other"),
      dueAt: dt(b.dueAt),
      hasTime: bool(b.hasTime),
      priority: oneOf<Priority>(b.priority, PRIORITIES, "medium"),
      status: oneOf<TaskStatus>(b.status, TASK_STATUSES, "not_started"),
      link: str(b.link, 600),
      notes: str(b.notes, 4000),
    },
  });
  return ok({ ec: created });
}
