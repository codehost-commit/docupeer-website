import { getStatusSnapshot } from "@/lib/status";
import { json, handleRouteError } from "@/lib/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const full = req.nextUrl.searchParams.get("full") === "1";
    const snapshot = await getStatusSnapshot({ includeOlderReports: full });
    if (full) return json(snapshot);

    return json({
      status: snapshot.status,
      serverTime: snapshot.serverTime,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
