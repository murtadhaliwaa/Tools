type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * حد معدّل بسيط في الذاكرة (مناسب لنسخة واحدة / تطوير).
 * للإنتاج متعدد الـ instances يُفضَّل Redis لاحقاً.
 */
export function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

export function clientKeyFromHeaders(headers: Headers, prefix: string) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip");
  const ip = forwarded || realIp || "unknown";
  return `${prefix}:${ip}`;
}
