import { getLiveSnapshot, saveLiveViewerCount } from "@/lib/live";
import { json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    await saveLiveViewerCount(body);
    return json({ ok: true, data: await getLiveSnapshot() });
  } catch (err) {
    return handleRouteError(err);
  }
}
