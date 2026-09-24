import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { body, getUserId, ok, str, unauthorized } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const uid = await getUserId();
  if (!uid) return unauthorized();
  const b = await body(req);
  const endpoint = str(b.endpoint, 1000);
  if (endpoint) await prisma.atomPushSubscription.deleteMany({ where: { userId: uid, endpoint } });
  return ok({ ok: true });
}
