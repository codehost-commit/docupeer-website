import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, bool, getUserId, ok, str, unauthorized } from "@/lib/atom/api";
import { getSettings } from "@/lib/atom/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  return ok({ settings: await getSettings(uid) });
}

export async function PATCH(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);

  const data: Record<string, unknown> = {};
  if (b.pushEnabled !== undefined) data.pushEnabled = bool(b.pushEnabled);
  if (b.emailEnabled !== undefined) data.emailEnabled = bool(b.emailEnabled);
  if (b.reminderDefaults !== undefined && typeof b.reminderDefaults === "object") data.reminderDefaults = b.reminderDefaults;
  if (b.categoryMutes !== undefined && typeof b.categoryMutes === "object") data.categoryMutes = b.categoryMutes;
  if (b.quietHours !== undefined && typeof b.quietHours === "object") data.quietHours = b.quietHours;
  if (b.timezone !== undefined) data.timezone = str(b.timezone, 60) ?? "America/Chicago";

  await prisma.atomSettings.upsert({
    where: { userId: uid },
    create: { userId: uid, ...data },
    update: data,
  });
  return ok({ settings: await getSettings(uid) });
}
