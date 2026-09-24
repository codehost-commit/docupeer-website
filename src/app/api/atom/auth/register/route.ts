import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { bad, body, isEmail, ok, reqStr } from "@/lib/atom/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const b = await body(req);
  const name = reqStr(b.name, 120);
  const email = reqStr(b.email, 200).toLowerCase();
  const password = reqStr(b.password, 200);

  if (!name) return bad("Enter your name.");
  if (!isEmail(email)) return bad("Enter a valid email address.");
  if (password.length < 8) return bad("Password must be at least 8 characters.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return bad("An account with that email already exists. Try signing in.", 409);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      // Placeholder reviewer-profile fields (Atom users are not part of peer review).
      expertiseCategory: "",
      specialty: "",
      educationLevel: "other",
    },
    select: { id: true, name: true, email: true },
  });

  await createSession(user.id);
  return ok({ ok: true, user: { ...user, onboarded: false } });
}
