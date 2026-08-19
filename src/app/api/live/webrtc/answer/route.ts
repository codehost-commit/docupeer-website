import { getLiveAnswer } from "@/lib/live";
import { json, handleRouteError } from "@/lib/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const answer = await getLiveAnswer(req.nextUrl.searchParams.get("viewerId"));
    return json({ answerSdp: answer?.answerSdp ?? null, status: answer?.status ?? "pending" });
  } catch (err) {
    return handleRouteError(err);
  }
}
