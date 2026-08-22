import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminMetrics } from "@/lib/admin-metrics";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    return json({ metrics: await getAdminMetrics() });
  } catch (err) {
    return handleRouteError(err);
  }
}
