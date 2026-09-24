import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, bool, getUserId, ok, str, unauthorized } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const [notifications, unreadCount] = await Promise.all([
    prisma.atomNotification.findMany({ where: { userId: uid }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.atomNotification.count({ where: { userId: uid, readAt: null } }),
  ]);
  return ok({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  if (bool(b.all)) {
    await prisma.atomNotification.updateMany({ where: { userId: uid, readAt: null }, data: { readAt: new Date() } });
    return ok({ ok: true });
  }
  const id = str(b.id, 40);
  if (id) await prisma.atomNotification.updateMany({ where: { id, userId: uid }, data: { readAt: new Date() } });
  return ok({ ok: true });
}

export async function DELETE() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  await prisma.atomNotification.deleteMany({ where: { userId: uid } });
  return ok({ ok: true });
}
