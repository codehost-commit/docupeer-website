import { createAdminDevSession } from "@/lib/admin-auth";
import { error, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    await createAdminDevSession(req, body.address);
    return json({ ok: true });
  } catch {
    return error("Unauthorized", 401);
  }
}
