import { hasAdminSession } from "@/lib/admin-auth";
import { error, handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await hasAdminSession())) return error("Unauthorized", 401);
    return json({
      ok: true,
      user: { id: "ADMIN" },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
