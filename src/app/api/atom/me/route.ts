import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, getUserId, ok, oneOf, str, unauthorized } from "@/lib/atom/api";
import type { GpaScale } from "@/lib/atom/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GPA_SCALES: GpaScale[] = ["4.0", "5.0", "percent", "none"];

export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      name: true,
      email: true,
      atomOnboardedAt: true,
      atomGradeLevel: true,
      atomAvatarUrl: true,
      gpaScale: true,
    },
  });
  if (!user) return unauthorized();
  return ok({
    id: user.id,
    name: user.name.toUpperCase(),
    email: user.email,
    onboarded: !!user.atomOnboardedAt,
    gradeLevel: user.atomGradeLevel,
    avatarUrl: user.atomAvatarUrl,
    gpaScale: (user.gpaScale as GpaScale) ?? "4.0",
  });
}

// Update profile / complete onboarding.
export async function PATCH(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);

  const data: Record<string, unknown> = {};
  if (b.name !== undefined) {
    const name = str(b.name, 120);
    if (!name) return bad("Name can't be empty.");
    data.name = name.toUpperCase();
  }
  if (b.gradeLevel !== undefined) data.atomGradeLevel = str(b.gradeLevel, 60);
  if (b.avatarUrl !== undefined) {
    // Optional avatar; cap size so we never store an oversized data URL.
    const a = str(b.avatarUrl, 700000);
    data.atomAvatarUrl = a;
  }
  if (b.gpaScale !== undefined) data.gpaScale = oneOf(b.gpaScale, GPA_SCALES, "4.0");
  if (b.completeOnboarding) data.atomOnboardedAt = new Date();

  await prisma.user.update({ where: { id: uid }, data });
  // Ensure a settings row exists once onboarded.
  if (b.completeOnboarding) {
    await prisma.atomSettings.upsert({
      where: { userId: uid },
      create: { userId: uid },
      update: {},
    });
  }
  return ok({ ok: true });
}
