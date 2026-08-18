import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const COOKIE_NAME = "docupeer_session";
const SESSION_DAYS = 30;

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export function destroySession(): void {
  cookies().set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

async function getUserIdFromCookie(): Promise<string | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  expertiseCategory: string;
  specialty: string;
  educationLevel: string;
  gradeYear: string | null;
  strength: number;
  createdAt: Date;
};

// Returns the authenticated user, or null if unauthenticated. Never exposes the
// password hash.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await getUserIdFromCookie();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      expertiseCategory: true,
      specialty: true,
      educationLevel: true,
      gradeYear: true,
      strength: true,
      createdAt: true,
    },
  });
  return user;
}

// Convenience for API routes that require auth.
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("UNAUTHENTICATED") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return user;
}
