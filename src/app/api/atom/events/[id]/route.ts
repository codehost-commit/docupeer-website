import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, notFound, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { EVENT_CATEGORIES, type EventCategory } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomEvent.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  const b = await body(req);
  const data: Record<string, unknown> = {};
  if (b.title !== undefined) {
    const t = str(b.title, 200);
    if (!t) return bad("Event title is required.");
    data.title = t;
  }
  if (b.description !== undefined) data.description = str(b.description, 4000);
  if (b.startAt !== undefined) {
    const s = dt(b.startAt);
    if (!s) return bad("Event start date is required.");
    data.startAt = s;
  }
  if (b.endAt !== undefined) data.endAt = dt(b.endAt);
  if (b.allDay !== undefined) data.allDay = bool(b.allDay);
  if (b.category !== undefined) data.category = oneOf<EventCategory>(b.category, EVENT_CATEGORIES, "personal");
  if (b.color !== undefined) data.color = str(b.color, 20);
  if (b.location !== undefined) data.location = str(b.location, 200);
  const updated = await prisma.atomEvent.update({ where: { id: params.id }, data });
  return ok({ event: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const existing = await prisma.atomEvent.findFirst({ where: { id: params.id, userId: uid } });
  if (!existing) return notFound();
  await prisma.atomEvent.delete({ where: { id: params.id } });
  return ok({ ok: true });
}
