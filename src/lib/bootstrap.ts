import { createHash, timingSafeEqual } from "crypto";

const MIN_SECRET_LEN = 16;

/** هل النظام بلا أي ملف شخصي بعد — يحتاج إقلاع مدير أول؟ */
export function isBootstrapPending(profileCount: number) {
  return profileCount === 0;
}

/**
 * يتحقق من رمز إقلاع أول مدير ب مقارنة آمنة زمنياً.
 * BOOTSTRAP_SECRET إلزامي (≥16) قبل إنشاء أول حساب نشط.
 */
export function verifyBootstrapSecret(provided: string): {
  ok: boolean;
  message?: string;
} {
  const expected = process.env.BOOTSTRAP_SECRET?.trim() ?? "";
  if (expected.length < MIN_SECRET_LEN) {
    return {
      ok: false,
      message:
        "إعداد الإقلاع غير مكتمل. اضبط BOOTSTRAP_SECRET (16 حرفاً على الأقل) في متغيرات البيئة.",
    };
  }

  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  if (!timingSafeEqual(a, b)) {
    return { ok: false, message: "رمز الإقلاع غير صحيح" };
  }
  return { ok: true };
}
