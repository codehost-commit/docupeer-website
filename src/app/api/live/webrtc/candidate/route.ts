import { addLiveCandidate } from "@/lib/live";
import { json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    await addLiveCandidate({ ...body, side: "viewer" });
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
