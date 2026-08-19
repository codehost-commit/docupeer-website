import { liveCandidates } from "@/lib/live";
import { json, handleRouteError } from "@/lib/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const candidates = await liveCandidates({
      viewerId: req.nextUrl.searchParams.get("viewerId"),
      side: "host",
      after: req.nextUrl.searchParams.get("after"),
    });
    return json({ candidates });
  } catch (err) {
    return handleRouteError(err);
  }
}
