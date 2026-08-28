import { cookies } from "next/headers";
import { recordUniquePageView } from "@/lib/admin-metrics";
import { handleRouteError, json } from "@/lib/http";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "docupeer_visitor";
// One year — long enough that a returning visitor is not double-counted.
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function newVisitorId() {
  // 128 bits of randomness rendered as hex.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST() {
  try {
    const jar = cookies();
    let visitorId = jar.get(VISITOR_COOKIE)?.value;
    if (!visitorId) {
      visitorId = newVisitorId();
      jar.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: VISITOR_COOKIE_MAX_AGE,
      });
    }
    await recordUniquePageView(visitorId);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
