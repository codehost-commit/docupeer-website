import { requireAdminSession } from "@/lib/admin-auth";
import { getAdminTalk } from "@/lib/tpt";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requireAdminSession();
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    return json({ items: await getAdminTalk(status) });
  } catch (err) {
    return handleRouteError(err);
  }
}
