import { incrementPageView } from "@/lib/admin-metrics";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await incrementPageView();
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
