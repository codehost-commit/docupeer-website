import {
  requireAdminDevSession,
  requireAdminSession,
} from "@/lib/admin-auth";
import { getAdminMetrics, saveAdminMetrics } from "@/lib/admin-metrics";
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

export async function POST(req: Request) {
  try {
    await requireAdminDevSession();
    const body = await req.json().catch(() => ({}));
    return json({ ok: true, metrics: await saveAdminMetrics(body) });
  } catch (err) {
    return handleRouteError(err);
  }
}
