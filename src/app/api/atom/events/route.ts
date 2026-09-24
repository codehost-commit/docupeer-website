import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, bool, dt, getUserId, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import { EVENT_CATEGORIES, type EventCategory, type EventRecurrence } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const events = await prisma.atomEvent.findMany({ where: { userId: uid }, orderBy: { startAt: "asc" } });
  return ok({ events });
}

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const title = str(b.title, 200);
  const startAt = dt(b.startAt);
  if (!title) return bad("Event title is required.");
  if (!startAt) return bad("Event start date is required.");
  const created = await prisma.atomEvent.create({
    data: {
      userId: uid,
      title,
      description: str(b.description, 4000),
      startAt,
      endAt: dt(b.endAt),
      allDay: bool(b.allDay),
      recurrence: oneOf<EventRecurrence>(b.recurrence, ["none", "daily", "weekly", "monthly"], "none"),
      recurrenceEndAt: dt(b.recurrenceEndAt),
      category: oneOf<EventCategory>(b.category, EVENT_CATEGORIES, "personal"),
      color: str(b.color, 20),
      location: str(b.location, 200),
    },
  });
  return ok({ event: created });
}
