import { destroyAdminSession } from "@/lib/admin-auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  destroyAdminSession();
  return json({ ok: true });
}
