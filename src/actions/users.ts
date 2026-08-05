"use server";

import { revalidatePath } from "next/cache";
import { bustProfileCache, requireRole } from "@/lib/auth";
import { bustUsersCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { toArabicErrorMessage } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createUserSchema,
  organizationSettingsSchema,
  updateUserSchema,
} from "@/lib/validations";
import { type ActionResult, guardRate, toActionError } from "@/actions/shared";

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
    await prisma.profile.updateMany({
      where: { id: userId, organizationId: profile.organizationId },
      data: { isActive: !target.isActive },
    });
    bustProfileCache(userId);
    bustUsersCache(profile.organizationId);
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
    await prisma.organization.updateMany({
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
    bustUsersCache(profile.organizationId);
    return { success: true, message: "تم إنشاء الحساب وتفعيله" };
  } catch (error) {
    return toActionError(error);
  }
}

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
    bustUsersCache(profile.organizationId);
    revalidatePath("/users");
    return { success: true, message: "تم تحديث بيانات الحساب" };
  } catch (error) {
    return toActionError(error);
  }
}
