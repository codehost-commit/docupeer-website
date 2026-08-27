import { requireUser } from "@/lib/auth";
import { getTokenStatus } from "@/lib/secretariat";
import { json, handleRouteError } from "@/lib/http";

export const dynamic = "force-dynamic";

// GET /api/secretariat/status -> current token pool for the signed-in user.
export async function GET() {
  try {
    const user = await requireUser();
    const tokens = await getTokenStatus(user.id);
    return json({ tokens });
  } catch (err) {
    return handleRouteError(err);
  }
}
