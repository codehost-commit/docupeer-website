// Minimal in-memory sliding-window rate limiter. Good enough for a single-node
// MVP; swap for Redis/Upstash in production by keeping this same signature.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; retryAfterMs: number };

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: existing.resetAt - now };
  }
  existing.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

// Occasionally clear expired buckets to bound memory.
setInterval(
  () => {
    const now = Date.now();
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  },
  5 * 60 * 1000
).unref?.();
