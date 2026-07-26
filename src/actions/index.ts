"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AuthError,
  ForbiddenError,
  bustProfileCache,
  clearRoleCookie,
  ensureProfile,
  requireRole,
  requireUser,
  syncRoleCookie,
} from "@/lib/auth";
import { bustCatalogCache, bustItemOptionsCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { toArabicErrorMessage } from "@/lib/errors";
import { clientKeyFromHeaders, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import {
  categorySchema,
  createTransactionSchema,
  createUserSchema,
  forgotPasswordSchema,
  itemSchema,
  loginSchema,
  machineSchema,
  organizationSettingsSchema,
  resetPasswordSchema,
  signupSchema,
  updateTransactionNotesSchema,
  updateUserSchema,
} from "@/lib/validations";
import { createTransaction } from "@/services/transactions";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

function toActionError(error: unknown): ActionResult {
  if (error instanceof AuthError || error instanceof ForbiddenError) {
    return { success: false, message: error.message };
  }
  return { success: false, message: toArabicErrorMessage(error) };
}

async function guardRate(prefix: string, limit = 8) {
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

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("login", 8);
  if (limited) return limited;

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "تحقق من البيانات المدخلة",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { success: false, message: "بيانات الدخول غير صحيحة" };
  }

  const fullName =
    (data.user.user_metadata?.full_name as string | undefined) ??
    parsed.data.email.split("@")[0];

  const profile = await ensureProfile(data.user.id, fullName);
  if (!profile.isActive) {
    await supabase.auth.signOut();
    await clearRoleCookie();
    return {
      success: false,
      message: "الحساب بانتظار موافقة المدير قبل تسجيل الدخول",
    };
  }

  await syncRoleCookie(profile.role);
  redirect("/dashboard");
}

export async function signupAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("signup", 5);
  if (limited) return limited;

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "تحقق من البيانات المدخلة",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingCount = await prisma.profile.count();
  const org = await prisma.organization.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (existingCount > 0 && org && !org.allowPublicSignup) {
    return {
      success: false,
      message:
        "التسجيل مغلق. اطلب من المدير تفعيل حسابك أو فتح التسجيل من الإعدادات.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { success: false, message: toArabicErrorMessage(error) };
  }

  if (data.user) {
    const profile = await ensureProfile(data.user.id, parsed.data.fullName, {
      activate: existingCount === 0,
    });

    if (!profile.isActive) {
      await supabase.auth.signOut();
      return {
        success: true,
        message:
          "تم إنشاء الحساب وهو بانتظار موافقة المدير قبل إمكانية الدخول.",
      };
    }
  }

  if (!data.session) {
    return {
      success: true,
      message:
        "تم إنشاء الحساب. إن كان تأكيد البريد مفعّلاً، أكّد بريدك ثم سجّل الدخول.",
    };
  }

  redirect("/dashboard");
}

export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("forgot", 5);
  if (limited) return limited;

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { success: false, message: "أدخل بريداً إلكترونياً صالحاً" };
  }

  const supabase = await createClient();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await headers()).get("origin") ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/reset`,
  });

  if (error) {
    return { success: false, message: toArabicErrorMessage(error) };
  }

  return {
    success: true,
    message: "إن وُجد الحساب، ستصلك رسالة لإعادة تعيين كلمة المرور.",
  };
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const limited = await guardRate("reset-password", 5);
  if (limited) return limited;

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "كلمة المرور غير مستوفية للشروط (8 أحرف + حرف ورقم)",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, message: toArabicErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearRoleCookie();
  redirect("/login");
}

export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const parsed = createTransactionSchema.parse(input);
    await createTransaction(parsed, profile);
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/items");
    revalidatePath("/reports");
    bustItemOptionsCache(profile.organizationId);
    return { success: true, message: "تم تسجيل الحركة بنجاح" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const data = categorySchema.parse(input);
    await prisma.category.create({
      data: {
        name: data.name,
        organizationId: profile.organizationId,
      },
    });
    bustCatalogCache(profile.organizationId);
    revalidatePath("/categories");
    return { success: true, message: "تم إضافة التصنيف" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateCategoryAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const data = categorySchema.parse(input);
    await prisma.category.updateMany({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
      data: { name: data.name },
    });
    bustCatalogCache(profile.organizationId);
    revalidatePath("/categories");
    return { success: true, message: "تم تحديث التصنيف" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const row = await prisma.category.findFirst({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
    });
    if (!row) return { success: false, message: "التصنيف غير موجود" };

    await prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    bustCatalogCache(profile.organizationId);
    revalidatePath("/categories");
    return { success: true, message: "تم حذف التصنيف" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createMachineAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const data = machineSchema.parse(input);
    await prisma.machine.create({
      data: {
        name: data.name,
        location: data.location || null,
        organizationId: profile.organizationId,
      },
    });
    bustCatalogCache(profile.organizationId);
    revalidatePath("/machines");
    return { success: true, message: "تم إضافة المكينة" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateMachineAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const data = machineSchema.parse(input);
    await prisma.machine.updateMany({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
      data: { name: data.name, location: data.location || null },
    });
    bustCatalogCache(profile.organizationId);
    revalidatePath("/machines");
    return { success: true, message: "تم تحديث المكينة" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteMachineAction(id: string): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const row = await prisma.machine.findFirst({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
    });
    if (!row) return { success: false, message: "المكينة غير موجودة" };

    await prisma.machine.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    bustCatalogCache(profile.organizationId);
    revalidatePath("/machines");
    return { success: true, message: "تم حذف المكينة" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createItemAction(input: unknown): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const data = itemSchema.parse(input);

    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!category) {
      return { success: false, message: "التصنيف غير موجود" };
    }

    await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          name: data.name,
          code: data.code || null,
          categoryId: data.categoryId,
          quantity: data.quantity,
          notes: data.notes || null,
          organizationId: profile.organizationId,
        },
      });

      await tx.transaction.create({
        data: {
          organizationId: profile.organizationId,
          type: "ADDITION",
          itemId: item.id,
          performedById: profile.id,
          notes: "إضافة عبر إدارة الأدوات",
        },
      });
    });

    revalidatePath("/items");
    revalidatePath("/dashboard");
    bustItemOptionsCache(profile.organizationId);
    return { success: true, message: "تم إضافة الأداة" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateItemAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const data = itemSchema.parse(input);

    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!category) {
      return { success: false, message: "التصنيف غير موجود" };
    }

    await prisma.item.updateMany({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
      data: {
        name: data.name,
        code: data.code || null,
        categoryId: data.categoryId,
        quantity: data.quantity,
        notes: data.notes || null,
      },
    });
    revalidatePath("/items");
    bustItemOptionsCache(profile.organizationId);
    return { success: true, message: "تم تحديث الأداة" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteItemAction(id: string): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const row = await prisma.item.findFirst({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
    });
    if (!row) return { success: false, message: "الأداة غير موجودة" };

    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/items");
    bustItemOptionsCache(profile.organizationId);
    return { success: true, message: "تم حذف الأداة" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: "ADMIN" | "KEEPER",
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    if (userId === profile.id) {
      return { success: false, message: "لا يمكنك تغيير دورك بنفسك" };
    }
    await prisma.profile.updateMany({
      where: { id: userId, organizationId: profile.organizationId },
      data: { role },
    });
    bustProfileCache(userId);
    revalidatePath("/users");
    return { success: true, message: "تم تحديث الدور" };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleUserActiveAction(
  userId: string,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    if (userId === profile.id) {
      return { success: false, message: "لا يمكنك إيقاف حسابك بنفسك" };
    }
    const target = await prisma.profile.findFirst({
      where: { id: userId, organizationId: profile.organizationId },
    });
    if (!target) {
      return { success: false, message: "المستخدم غير موجود" };
    }
    await prisma.profile.update({
      where: { id: userId },
      data: { isActive: !target.isActive },
    });
    bustProfileCache(userId);
    revalidatePath("/users");
    return {
      success: true,
      message: target.isActive ? "تم إيقاف الحساب" : "تم تفعيل الحساب",
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateOrganizationSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const data = organizationSettingsSchema.parse(input);
    await prisma.organization.update({
      where: { id: profile.organizationId },
      data: {
        name: data.name,
        allowPublicSignup: data.allowPublicSignup,
      },
    });
    revalidatePath("/settings");
    return { success: true, message: "تم حفظ الإعدادات" };
  } catch (error) {
    return toActionError(error);
  }
}

/** إنشاء حساب من لوحة المدير (يتطلب SERVICE_ROLE) */
export async function createUserAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const data = createUserSchema.parse(input);
    const limited = await guardRate(`create-user:${profile.id}`, 10);
    if (limited) return limited;

    const admin = createAdminClient();
    const { data: authData, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });

    if (error || !authData.user) {
      return {
        success: false,
        message: error?.message?.includes("already")
          ? "البريد الإلكتروني مستخدم مسبقاً"
          : toArabicErrorMessage(error ?? new Error("فشل إنشاء الحساب")),
      };
    }

    try {
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          fullName: data.fullName,
          role: data.role,
          isActive: true,
          organizationId: profile.organizationId,
        },
      });
    } catch (createError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      throw createError;
    }

    revalidatePath("/users");
    return { success: true, message: "تم إنشاء الحساب وتفعيله" };
  } catch (error) {
    return toActionError(error);
  }
}

/** تعديل اسم ودور المستخدم */
export async function updateUserAction(
  userId: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const data = updateUserSchema.parse(input);

    if (userId === profile.id && data.role !== profile.role) {
      return { success: false, message: "لا يمكنك تغيير دورك بنفسك" };
    }

    const updated = await prisma.profile.updateMany({
      where: { id: userId, organizationId: profile.organizationId },
      data: { fullName: data.fullName, role: data.role },
    });
    if (updated.count === 0) {
      return { success: false, message: "المستخدم غير موجود" };
    }

    bustProfileCache(userId);
    revalidatePath("/users");
    return { success: true, message: "تم تحديث بيانات الحساب" };
  } catch (error) {
    return toActionError(error);
  }
}

/** تعديل ملاحظات حركة */
export async function updateTransactionNotesAction(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const data = updateTransactionNotesSchema.parse(input);
    const tx = await prisma.transaction.findFirst({
      where: { id, organizationId: profile.organizationId },
      select: { id: true, performedById: true },
    });
    if (!tx) return { success: false, message: "الحركة غير موجودة" };

    const canEdit =
      profile.role === "ADMIN" || tx.performedById === profile.id;
    if (!canEdit) {
      return { success: false, message: "ليس لديك صلاحية تعديل هذه الحركة" };
    }

    await prisma.transaction.update({
      where: { id },
      data: { notes: data.notes || null },
    });
    revalidatePath("/transactions");
    revalidatePath("/reports");
    return { success: true, message: "تم تحديث الملاحظات" };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * حذف آخر حركة لأداة (تصحيح خطأ فقط).
 * لا يُسمح بحذف حركة ليست الأحدث لنفس الأداة.
 */
export async function deleteTransactionAction(
  id: string,
): Promise<ActionResult> {
  try {
    const { profile } = await requireRole(["ADMIN"]);
    const tx = await prisma.transaction.findFirst({
      where: { id, organizationId: profile.organizationId },
    });
    if (!tx) return { success: false, message: "الحركة غير موجودة" };

    await prisma.$transaction(async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tx.itemId}))`;

      const latest = await db.transaction.findFirst({
        where: { itemId: tx.itemId, organizationId: profile.organizationId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (latest?.id !== id) {
        throw new Error(
          "يمكن حذف آخر حركة للأداة فقط للحفاظ على تسلسل السجل",
        );
      }

      await db.transaction.delete({ where: { id } });

      // إن كانت إضافة وحيدة بدون حركات لاحقة — احذف الأداة منطقياً
      if (tx.type === "ADDITION") {
        const remaining = await db.transaction.count({
          where: { itemId: tx.itemId },
        });
        if (remaining === 0) {
          await db.item.updateMany({
            where: { id: tx.itemId, deletedAt: null },
            data: { deletedAt: new Date() },
          });
        }
      }
    });

    bustItemOptionsCache(profile.organizationId);
    revalidatePath("/transactions");
    revalidatePath("/items");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, message: "تم حذف الحركة" };
  } catch (error) {
    return toActionError(error);
  }
}
