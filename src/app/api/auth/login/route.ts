import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { json, error, handleRouteError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`login:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.ok) return error("Too many attempts. Try again later.", 429);

    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password)
      return error("Enter your email and password.", 400);

    const user = await prisma.user.findUnique({ where: { email } });
    // Constant-ish response to avoid leaking which emails exist.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return error("Incorrect email or password.", 401);
    }

    await createSession(user.id);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
