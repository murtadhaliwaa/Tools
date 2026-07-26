import { headers } from "next/headers";
import { AuthError, ForbiddenError } from "@/lib/auth";
import { toArabicErrorMessage } from "@/lib/errors";
import { clientKeyFromHeaders, rateLimit } from "@/lib/rate-limit";

export type ActionResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export function toActionError(error: unknown): ActionResult {
  if (error instanceof AuthError || error instanceof ForbiddenError) {
    return { success: false, message: error.message };
  }
  return { success: false, message: toArabicErrorMessage(error) };
}

export async function guardRate(prefix: string, limit = 8) {
  const h = await headers();
  const key = clientKeyFromHeaders(h, prefix);
  const result = await rateLimit(key, limit, 60_000);
  if (!result.ok) {
    return {
      success: false as const,
      message: `محاولات كثيرة. حاول بعد ${result.retryAfterSec} ثانية`,
    };
  }
  return null;
}

export function requireSiteUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return null;
}
