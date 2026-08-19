import { hasLiveManageAccess, liveCandidates } from "@/lib/live";
import { error, json, handleRouteError } from "@/lib/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!hasLiveManageAccess(req)) return error("Unauthorized", 401);
    const candidates = await liveCandidates({
      viewerId: req.nextUrl.searchParams.get("viewerId"),
      side: "viewer",
      after: req.nextUrl.searchParams.get("after"),
    });
    return json({ candidates });
  } catch (err) {
    return handleRouteError(err);
  }
}
