import { requireAdminSession } from "@/lib/admin-auth";
import { deleteTalkSubmission } from "@/lib/tpt";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    await deleteTalkSubmission(params.id);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
