import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { bad, body, getUserId, ok, unauthorized } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body<{ subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } }>(req);
  const sub = b.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return bad("Invalid push subscription.");

  await prisma.atomPushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: {
      userId: uid,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    update: { userId: uid, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return ok({ ok: true });
}
