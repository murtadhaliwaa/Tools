type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
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

/** Upstash Redis REST — يُستخدم تلقائياً إن وُجدت المتغيرات */
async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redisKey = `rl:${key}`;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));

  try {
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(redisKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = Number(incrJson.result ?? 0);

    if (count === 1) {
      await fetch(
        `${url}/expire/${encodeURIComponent(redisKey)}/${windowSec}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
    }

    if (count > limit) {
      const ttlRes = await fetch(
        `${url}/ttl/${encodeURIComponent(redisKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const ttlJson = (await ttlRes.json()) as { result?: number };
      const ttl = Number(ttlJson.result ?? windowSec);
      return {
        ok: false,
        retryAfterSec: Math.max(1, ttl > 0 ? ttl : windowSec),
      };
    }

    return { ok: true, retryAfterSec: 0 };
  } catch {
    return null;
  }
}

/**
 * حد معدّل: Upstash إن توفر، وإلا ذاكرة العملية.
 * على Vercel متعدد الـ instances يُفضَّل ضبط UPSTASH_REDIS_REST_URL/TOKEN.
 */
export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const remote = await upstashRateLimit(key, limit, windowMs);
  if (remote) return remote;
  return memoryRateLimit(key, limit, windowMs);
}

/** توافق مع الاستدعاءات المتزامنة القديمة */
export function rateLimitSync(
  key: string,
  limit = 8,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec: number } {
  return memoryRateLimit(key, limit, windowMs);
}

export function clientKeyFromHeaders(headers: Headers, prefix: string) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headers.get("x-real-ip");
  const ip = forwarded || realIp || "unknown";
  return `${prefix}:${ip}`;
}
