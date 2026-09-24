import { prisma } from "@/lib/db";
import { getUserId, ok, unauthorized } from "@/lib/atom/api";
import { getSettings } from "@/lib/atom/settings";
import type { GpaScale } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Single read that powers the whole client. Grades are computed client-side from
// this raw data via the shared grade engine; snapshots supply history/trend.
export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();

  const [user, classes, assignments, ec, tasks, events, snapshots, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: uid },
      select: { id: true, name: true, email: true, atomOnboardedAt: true, atomGradeLevel: true, atomAvatarUrl: true, gpaScale: true },
    }),
    prisma.atomClass.findMany({
      where: { userId: uid },
      orderBy: [{ archived: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: { categories: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.atomAssignment.findMany({ where: { userId: uid }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] }),
    prisma.atomECDeadline.findMany({ where: { userId: uid }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] }),
    prisma.atomTask.findMany({ where: { userId: uid }, orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }] }),
    prisma.atomEvent.findMany({ where: { userId: uid }, orderBy: { startAt: "asc" } }),
    prisma.atomGradeSnapshot.findMany({
      where: { userId: uid },
      orderBy: { capturedAt: "asc" },
      select: { classId: true, percent: true, letter: true, capturedAt: true },
    }),
    getSettings(uid),
  ]);

  if (!user) return unauthorized();

  return ok({
    profile: {
      id: user.id,
      name: user.name.toUpperCase(),
      email: user.email,
      onboarded: !!user.atomOnboardedAt,
      gradeLevel: user.atomGradeLevel,
      avatarUrl: user.atomAvatarUrl,
      gpaScale: (user.gpaScale as GpaScale) ?? "4.0",
    },
    settings,
    classes,
    assignments,
    ec,
    tasks,
    events,
    snapshots,
  });
}
