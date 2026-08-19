import { hasLiveManageAccess, saveLiveChunk } from "@/lib/live";
import { error, handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    if (!hasLiveManageAccess(req)) return error("Unauthorized", 401);
    const data = await req.arrayBuffer();
    const chunk = await saveLiveChunk({
      mimeType: req.headers.get("x-docupeer-live-mime"),
      data,
    });
    return json({ ok: true, chunk });
  } catch (err) {
    return handleRouteError(err);
  }
}
