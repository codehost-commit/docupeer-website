import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createTalkSubmission } from "@/lib/tpt";
import { error, handleRouteError, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function requestKey(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    const rl = rateLimit(`tpt:${requestKey(req)}`, 8, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many submissions too quickly. Try again later.", 429);

    const body = await req.json().catch(() => ({}));
    const user = await getCurrentUser();
    const result = await createTalkSubmission(body, user?.id);

    if (!result.ok) return json({ errors: result.errors }, 422);
    return json({ ok: true, submission: result.submission }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
