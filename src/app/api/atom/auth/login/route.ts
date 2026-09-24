import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { bad, body, ok, reqStr } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const b = await body(req);
  const email = reqStr(b.email, 200).toLowerCase();
  const password = reqStr(b.password, 200);
  if (!email || !password) return bad("Enter your email and password.");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return bad("Incorrect email or password.", 401);
  }

  await createSession(user.id);
  return ok({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, onboarded: !!user.atomOnboardedAt },
  });
}
