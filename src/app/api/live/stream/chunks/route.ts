import { getLiveSnapshot, liveChunks } from "@/lib/live";
import { handleRouteError, json } from "@/lib/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const snapshot = await getLiveSnapshot();
    const chunks = snapshot.live.isLive
      ? await liveChunks(req.nextUrl.searchParams.get("after"))
      : [];
    return json({ live: snapshot.live, chunks });
  } catch (err) {
    return handleRouteError(err);
  }
}
