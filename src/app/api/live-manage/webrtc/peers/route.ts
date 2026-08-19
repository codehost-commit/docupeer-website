import { hasLiveManageAccess, pendingLivePeers } from "@/lib/live";
import { error, json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!(await hasLiveManageAccess(req))) return error("Unauthorized", 401);
    return json({ peers: await pendingLivePeers() });
  } catch (err) {
    return handleRouteError(err);
  }
}
