import { prisma } from "@/lib/db";
import { getUserId, unauthorized } from "@/lib/atom/api";
import { getSettings } from "@/lib/atom/settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Full transparency export: everything Atom stores about this user, as JSON.
export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();

  const [user, classes, assignments, ec, tasks, events, snapshots, notifications, pushSubs, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, name: true, email: true, createdAt: true, atomOnboardedAt: true, atomGradeLevel: true, atomAvatarUrl: true, gpaScale: true },
    }),
    prisma.atomClass.findMany({ where: { userId: uid }, include: { categories: true } }),
    prisma.atomAssignment.findMany({ where: { userId: uid } }),
    prisma.atomECDeadline.findMany({ where: { userId: uid } }),
    prisma.atomTask.findMany({ where: { userId: uid } }),
    prisma.atomEvent.findMany({ where: { userId: uid } }),
    prisma.atomGradeSnapshot.findMany({ where: { userId: uid } }),
    prisma.atomNotification.findMany({ where: { userId: uid } }),
    prisma.atomPushSubscription.findMany({ where: { userId: uid }, select: { endpoint: true, userAgent: true, createdAt: true } }),
    getSettings(uid),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Atom by DocuPeer",
    account: user,
    settings,
    classes,
    assignments,
    ecDeadlines: ec,
    tasks,
    events,
    gradeHistory: snapshots,
    notifications,
    pushSubscriptions: pushSubs,
  };

  const filename = `atom-data-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
