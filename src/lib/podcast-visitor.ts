import { createHmac } from "node:crypto";

export function podcastClientAddress(req: Request) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function isPodcastLocalhost(req: Request) {
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const closingBracket = host.indexOf("]");
  const hostname = host.startsWith("[")
    ? closingBracket === -1
      ? host
      : host.slice(1, closingBracket)
    : host.split(":")[0];

  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function podcastVisitorKey(req: Request) {
  if (isPodcastLocalhost(req)) return null;

  // Store an opaque, stable identifier rather than the visitor's IP address.
  // DATABASE_URL is always configured when this route can reach Prisma; the
  // dedicated variable lets production rotate this identifier independently.
  const secret =
    process.env.PODCAST_COMMENT_IDENTITY_SECRET ||
    process.env.DATABASE_URL ||
    "docupeer-podcast-local-fallback";

  return createHmac("sha256", secret)
    .update(podcastClientAddress(req))
    .digest("hex");
}
