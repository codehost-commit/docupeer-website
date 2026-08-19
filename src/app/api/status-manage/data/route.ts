import { getStatusSnapshot, hasStatusManageAccess } from "@/lib/status";
import { error, json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!hasStatusManageAccess(req)) return error("Unauthorized", 401);
    return json(await getStatusSnapshot({ includeOlderReports: true }));
  } catch (err) {
    return handleRouteError(err);
  }
}
