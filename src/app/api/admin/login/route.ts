import {
  createAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth";
import { error, handleRouteError, json } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const key =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "unknown";
    const rl = rateLimit(`admin-login:${key}`, 20, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many attempts. Try again later.", 429);

    if (!verifyAdminCredentials(body.username, body.password)) {
      return error("Those credentials do not match.", 401);
    }

    await createAdminSession();
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
