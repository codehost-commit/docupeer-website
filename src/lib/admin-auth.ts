import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "docupeer_admin_session";
const ADMIN_DEV_COOKIE_NAME = "docupeer_admin_dev";
const ADMIN_USERNAME = "ADMIN";
const ADMIN_PASSWORD = "12345678";
const ADMIN_SESSION_DAYS = 7;
const ADMIN_DEV_HOURS = 12;
const DEV_ACCESS_ADDRESS = "67.6.18.41";

type AdminScope = "admin" | "admin-dev";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env");
  }
  return new TextEncoder().encode(secret);
}

async function signAdminToken(scope: AdminScope, expiresIn: string) {
  return new SignJWT({ sub: ADMIN_USERNAME, scope })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

async function verifyAdminCookie(name: string, scope: AdminScope) {
  const token = cookies().get(name)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.sub === ADMIN_USERNAME && payload.scope === scope;
  } catch {
    return false;
  }
}

function cookieBase(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function verifyAdminCredentials(username: unknown, password: unknown) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export async function createAdminSession() {
  cookies().set(
    ADMIN_COOKIE_NAME,
    await signAdminToken("admin", `${ADMIN_SESSION_DAYS}d`),
    cookieBase(ADMIN_SESSION_DAYS * 24 * 60 * 60),
  );
}

export function destroyAdminSession() {
  cookies().set(ADMIN_COOKIE_NAME, "", cookieBase(0));
  cookies().set(ADMIN_DEV_COOKIE_NAME, "", cookieBase(0));
}

export async function hasAdminSession() {
  return verifyAdminCookie(ADMIN_COOKIE_NAME, "admin");
}

export async function requireAdminSession() {
  if (await hasAdminSession()) return;
  const err = new Error("Unauthorized") as Error & { status?: number };
  err.status = 401;
  throw err;
}

function requestAddress(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("cf-connecting-ip")?.trim() ||
    ""
  );
}

function isLocalAdminRequest(req: Request) {
  const host = req.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export async function createAdminDevSession(req: Request, addressInput: unknown) {
  await requireAdminSession();
  const address = String(addressInput || "").trim();
  const requestIp = requestAddress(req);
  if (
    !isLocalAdminRequest(req) ||
    (address !== DEV_ACCESS_ADDRESS && requestIp !== DEV_ACCESS_ADDRESS)
  ) {
    const err = new Error("Unauthorized") as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  cookies().set(
    ADMIN_DEV_COOKIE_NAME,
    await signAdminToken("admin-dev", `${ADMIN_DEV_HOURS}h`),
    cookieBase(ADMIN_DEV_HOURS * 60 * 60),
  );
}

export async function hasAdminDevSession() {
  return verifyAdminCookie(ADMIN_DEV_COOKIE_NAME, "admin-dev");
}

export async function requireAdminDevSession() {
  await requireAdminSession();
  if (await hasAdminDevSession()) return;
  const err = new Error("Unauthorized") as Error & { status?: number };
  err.status = 401;
  throw err;
}
