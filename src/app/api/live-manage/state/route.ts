import { getLiveSnapshot, hasLiveManageAccess, saveLiveState } from "@/lib/live";
import { error, json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!hasLiveManageAccess(req)) return error("Unauthorized", 401);
    return json(await getLiveSnapshot());
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    if (!hasLiveManageAccess(req)) return error("Unauthorized", 401);
    const body = await req.json().catch(() => ({}));
    await saveLiveState(body);
    return json({ ok: true, data: await getLiveSnapshot() });
  } catch (err) {
    return handleRouteError(err);
  }
}
