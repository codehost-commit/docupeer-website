import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { validateRegistration } from "@/lib/validation";
import { sanitizeLine } from "@/lib/sanitize";
import { json, error, handleRouteError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { educationNeedsGrade } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    const rl = rateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
    if (!rl.ok) return error("Too many attempts. Try again later.", 429);

    const body = await req.json().catch(() => ({}));
    const result = validateRegistration(body);
    if (!result.ok) return json({ errors: result.errors }, 422);

    const email = String(body.email).trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return json({ errors: { email: "An account with this email already exists." } }, 409);

    const needsGrade = educationNeedsGrade(String(body.educationLevel));

    const user = await prisma.user.create({
      data: {
        name: sanitizeLine(body.name, 120),
        email,
        passwordHash: await hashPassword(String(body.password)),
        expertiseCategory: String(body.expertiseCategory),
        specialty: sanitizeLine(body.specialty, 120),
        educationLevel: String(body.educationLevel),
        gradeYear: needsGrade ? sanitizeLine(body.gradeYear, 60) : null,
        strength: Math.round(Number(body.strength)),
      },
      select: { id: true },
    });

    await createSession(user.id);
    return json({ ok: true }, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
