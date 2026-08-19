import { failLivePeer, hasLiveManageAccess } from "@/lib/live";
import { error, json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!hasLiveManageAccess(req)) return error("Unauthorized", 401);
    const body = await req.json().catch(() => ({}));
    await failLivePeer(body.viewerId);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
