type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const AUTH_RATE_PREFIXES = new Set([
  "login",
  "signup",
  "forgot",
  "reset-password",
]);

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

export function isUpstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

/** مسارات المصادقة الحساسة */
export function isAuthRatePrefix(prefix: string) {
  return AUTH_RATE_PREFIXES.has(prefix);
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

/** Upstash Redis REST — يُستخدم تلقائياً إن وُجدت المتغيرات */
async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
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
      const ttlRes = await fetch(`${url}/ttl/${encodeURIComponent(redisKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
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

/** حد معدّل عبر Postgres — موحّد عبر مثيلات Vercel بدون Upstash */
async function postgresRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ ok: boolean; retryAfterSec: number } | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;

  try {
    const { prisma } = await import("@/lib/db");
    const now = new Date();
    const resetAt = new Date(now.getTime() + windowMs);
    const bucketKey = `rl:${key}`;

    const existing = await prisma.rateLimitBucket.findUnique({
      where: { key: bucketKey },
    });

    if (!existing || existing.resetAt <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key: bucketKey },
        create: { key: bucketKey, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { ok: true, retryAfterSec: 0 };
    }

    if (existing.count >= limit) {
      return {
        ok: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000),
        ),
      };
    }

    await prisma.rateLimitBucket.update({
      where: { key: bucketKey },
      data: { count: { increment: 1 } },
    });
    return { ok: true, retryAfterSec: 0 };
  } catch {
    return null;
  }
}

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
  /** unavailable = فشل المخزن الصارم؛ limited = تجاوز الحد */
  reason?: "unavailable" | "limited";
};

export type RateLimitOptions = {
  /**
   * true = عند فشل Upstash لا نسقط لبدائل (fail-closed).
   * يُفعَّل لمسارات المصادقة في الإنتاج إذا
   * `AUTH_RATE_LIMIT_FAIL_CLOSED=true` وUpstash مضبوط.
   */
  strict?: boolean;
};

function authFailClosedEnabled() {
  return process.env.AUTH_RATE_LIMIT_FAIL_CLOSED?.trim() === "true";
}

/**
 * حد معدّل: Upstash → Postgres → ذاكرة العملية.
 * Postgres يكفي لتوحيد الحد عبر مثيلات Vercel بدون خدمة خارجية.
 */
export async function rateLimit(
  key: string,
  limit = 8,
  windowMs = 60_000,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  const prefix = key.split(":")[0] ?? key;
  const authStrictDefault =
    isProductionRuntime() &&
    isAuthRatePrefix(prefix) &&
    isUpstashConfigured() &&
    authFailClosedEnabled();
  const strict = options?.strict === true || authStrictDefault;

  const remote = await upstashRateLimit(key, limit, windowMs);
  if (remote) {
    return remote.ok ? remote : { ...remote, reason: "limited" };
  }

  if (strict && isUpstashConfigured()) {
    return { ok: false, retryAfterSec: 60, reason: "unavailable" };
  }

  const db = await postgresRateLimit(key, limit, windowMs);
  if (db) {
    return db.ok ? db : { ...db, reason: "limited" };
  }

  const local = memoryRateLimit(key, limit, windowMs);
  return local.ok ? local : { ...local, reason: "limited" };
}

/** توافق مع الاستدعاءات المتزامنة القديمة / الاختبارات (ذاكرة فقط) */
export function rateLimitSync(
  key: string,
  limit = 8,
  windowMs = 60_000,
): { ok: boolean; retryAfterSec: number } {
  return memoryRateLimit(key, limit, windowMs);
}

/**
 * مفتاح العميل: يفضّل IP الذي تضبطه المنصة (Vercel x-real-ip)،
 * ثم آخر قفزة في x-forwarded-for (أقرب للبروكسي) لتقليل التزوير.
 */
export function clientKeyFromHeaders(headers: Headers, prefix: string) {
  const realIp = headers.get("x-real-ip")?.trim();
  const vercelForwarded = headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const forwarded = headers.get("x-forwarded-for");
  const forwardedLast = forwarded
    ? forwarded.split(",").map((p) => p.trim()).filter(Boolean).at(-1)
    : undefined;
  const ip = realIp || vercelForwarded || forwardedLast || "unknown";
  return `${prefix}:${ip}`;
}
