import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { USER_HEADER } from "@/lib/auth-headers";
import type { Profile, Role } from "@/generated/prisma/client";

export type SessionProfile = Profile;

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "ليس لديك صلاحية لتنفيذ هذا الإجراء") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function profileTag(userId: string) {
  return `profile-${userId}`;
}

export function bustProfileCache(userId: string) {
  revalidateTag(profileTag(userId), "max");
}

/** يزامن الدور إلى كوكي فقط عند الاختلاف — يقلل الكتابة على كل طلب */
export async function syncRoleCookie(role: Role) {
  const cookieStore = await cookies();
  if (cookieStore.get("app_role")?.value === role) return;

  cookieStore.set("app_role", role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearRoleCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("app_role");
}

function getCachedProfile(userId: string) {
  return unstable_cache(
    async () =>
      prisma.profile.findUnique({
        where: { id: userId },
      }),
    [profileTag(userId)],
    { revalidate: 60, tags: [profileTag(userId)] },
  )();
}

/**
 * يضمن وجود Profile مرتبط بالمستخدم بعد تسجيل الدخول/التسجيل.
 * أول مستخدم في النظام يصبح ADMIN ويُربط بالمؤسسة الافتراضية.
 */
export async function ensureProfile(
  userId: string,
  fullName: string,
  options?: { activate?: boolean },
): Promise<Profile> {
  const existing = await getCachedProfile(userId);
  if (existing) {
    await syncRoleCookie(existing.role);
    return existing;
  }

  const profile = await prisma.$transaction(async (tx) => {
    const stillExists = await tx.profile.findUnique({ where: { id: userId } });
    if (stillExists) return stillExists;

    const profileCount = await tx.profile.count();
    let org = await tx.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!org) {
      org = await tx.organization.create({
        data: { name: "ورشة الشركة", allowPublicSignup: false },
      });
    }

    const isFirst = profileCount === 0;
    return tx.profile.create({
      data: {
        id: userId,
        fullName: fullName || "مستخدم",
        role: isFirst ? "ADMIN" : "KEEPER",
        isActive: isFirst ? true : (options?.activate ?? false),
        organizationId: org.id,
      },
    });
  });

  bustProfileCache(userId);
  await syncRoleCookie(profile.role);
  return profile;
}

type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

/** يعتمد هوية Middleware أولاً — يتجنب استدعاء Supabase مرتين لكل تنقل */
async function resolveAuthUser(): Promise<AuthUser> {
  const h = await headers();
  const headerId = h.get(USER_HEADER.id);
  if (headerId) {
    const encodedName = h.get(USER_HEADER.name);
    const name = encodedName ? decodeURIComponent(encodedName) : undefined;
    return {
      id: headerId,
      email: h.get(USER_HEADER.email),
      user_metadata: name ? { full_name: name } : {},
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("يجب تسجيل الدخول أولاً");
  }

  return user;
}

/**
 * جلسة المستخدم — مُخزَّنة بـ React cache لنفس الطلب (layout + page = استعلام واحد).
 */
export const requireUser = cache(async () => {
  const user = await resolveAuthUser();

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "مستخدم";

  const profile = await ensureProfile(user.id, fullName);

  if (!profile.isActive) {
    throw new ForbiddenError(
      "الحساب بانتظار موافقة المدير. تواصل مع الإدارة لتفعيله.",
    );
  }

  return { user, profile };
});

export async function requireRole(roles: Role[]) {
  const session = await requireUser();
  if (!roles.includes(session.profile.role)) {
    throw new ForbiddenError();
  }
  return session;
}

/** للصفحات: يحوّل Forbidden إلى redirect بدل صفحة خطأ */
export async function requireAdminPage() {
  const session = await requireUser();
  if (session.profile.role !== "ADMIN") {
    redirect("/dashboard");
  }
  return session;
}

export async function getOptionalSession() {
  try {
    return await requireUser();
  } catch {
    return null;
  }
}
