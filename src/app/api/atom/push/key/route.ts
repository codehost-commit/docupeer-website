import { ok } from "@/lib/atom/api";
import { pushConfigured, vapidPublicKey } from "@/lib/atom/notify";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return ok({ key: vapidPublicKey(), configured: pushConfigured() });
}
