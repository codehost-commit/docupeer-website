import { addStatusReport, getStatusSnapshot, hasStatusManageAccess } from "@/lib/status";
import { error, json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!hasStatusManageAccess(req)) return error("Unauthorized", 401);
    const body = await req.json().catch(() => ({}));
    await addStatusReport(body.message);
    return json({ ok: true, data: await getStatusSnapshot({ includeOlderReports: true }) });
  } catch (err) {
    return handleRouteError(err);
  }
}
