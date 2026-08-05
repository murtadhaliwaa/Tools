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

/** مسارات المصادقة الحساسة — يُفضَّل Upstash في الإنتاج */
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

export type RateLimitResult = {
  ok: boolean;
  retryAfterSec: number;
  /** unavailable = فشل Redis مع تفعيل fail-closed؛ limited = تجاوز الحد */
  reason?: "unavailable" | "limited";
};

export type RateLimitOptions = {
  /**
   * true = عند فشل Upstash لا نسقط للذاكرة (fail-closed).
   * يُفعَّل تلقائياً لمسارات المصادقة في الإنتاج فقط إذا
   * `AUTH_RATE_LIMIT_FAIL_CLOSED=true` وUpstash مضبوط.
   */
  strict?: boolean;
};

function authFailClosedEnabled() {
  return process.env.AUTH_RATE_LIMIT_FAIL_CLOSED?.trim() === "true";
}

/**
 * حد معدّل: Upstash إن توفر، وإلا ذاكرة العملية.
 * للمصادقة في الإنتاج يُفضَّل Upstash (متعدد المثيلات). بدونها يعمل الدخول
 * بحدّ محلي لكل مثيل — فعّل AUTH_RATE_LIMIT_FAIL_CLOSED=true لرفض الدخول عند تعطّل Redis.
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

  if (
    isProductionRuntime() &&
    isAuthRatePrefix(prefix) &&
    !isUpstashConfigured()
  ) {
    console.error(
      "[rate-limit] UPSTASH غير مضبوط — استخدام حدّ الذاكرة لمسار المصادقة",
    );
  }

  const remote = await upstashRateLimit(key, limit, windowMs);
  if (remote) {
    return remote.ok
      ? remote
      : { ...remote, reason: "limited" };
  }

  if (strict && isUpstashConfigured()) {
    return { ok: false, retryAfterSec: 60, reason: "unavailable" };
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
  const vercelForwarded = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwarded = headers.get("x-forwarded-for");
  const forwardedLast = forwarded
    ? forwarded.split(",").map((p) => p.trim()).filter(Boolean).at(-1)
    : undefined;
  const ip = realIp || vercelForwarded || forwardedLast || "unknown";
  return `${prefix}:${ip}`;
}
