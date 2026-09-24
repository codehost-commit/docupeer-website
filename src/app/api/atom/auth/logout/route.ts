import { destroySession } from "@/lib/auth";
import { ok } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  destroySession();
  return ok({ ok: true });
}
