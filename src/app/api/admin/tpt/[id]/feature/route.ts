import { requireAdminSession } from "@/lib/admin-auth";
import { setTalkSubmissionFeatured } from "@/lib/tpt";
import { error, handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdminSession();
    const body = await req.json().catch(() => ({}));
    const item = await setTalkSubmissionFeatured(params.id, body.featured === true);
    if (!item) return error("Submission not found.", 404);
    return json({ ok: true, item });
  } catch (err) {
    return handleRouteError(err);
  }
}
