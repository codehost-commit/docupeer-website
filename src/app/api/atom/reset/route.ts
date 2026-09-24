import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, getUserId, ok, reqStr, unauthorized } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Danger zone: wipe all Atom data for this user. Requires the user to type their
// exact name (also enforced client-side in the confirmation modal).
export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const confirmName = reqStr(b.confirmName, 200);

  const user = await prisma.user.findUnique({ where: { id: uid }, select: { name: true } });
  if (!user) return unauthorized();
  if (confirmName.toLowerCase() !== user.name.trim().toLowerCase()) {
    return bad("Name confirmation did not match. Nothing was deleted.");
  }

  await prisma.$transaction([
    prisma.atomAssignment.deleteMany({ where: { userId: uid } }),
    prisma.atomECDeadline.deleteMany({ where: { userId: uid } }),
    prisma.atomTask.deleteMany({ where: { userId: uid } }),
    prisma.atomEvent.deleteMany({ where: { userId: uid } }),
    prisma.atomGradeSnapshot.deleteMany({ where: { userId: uid } }),
    prisma.atomNotification.deleteMany({ where: { userId: uid } }),
    prisma.atomPushSubscription.deleteMany({ where: { userId: uid } }),
    prisma.atomSettings.deleteMany({ where: { userId: uid } }),
    prisma.atomClass.deleteMany({ where: { userId: uid } }), // cascades categories + snapshots
    prisma.user.update({
      where: { id: uid },
      data: { atomOnboardedAt: null, atomGradeLevel: null, atomAvatarUrl: null },
    }),
  ]);

  return ok({ ok: true });
}
