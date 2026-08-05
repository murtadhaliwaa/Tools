"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { bustCatalogCache, bustItemOptionsCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { categorySchema, itemSchema, machineSchema } from "@/lib/validations";
import { createTransaction } from "@/services/transactions";
import { type ActionResult, guardRate, toActionError } from "@/actions/shared";

/** ADMIN + KEEPER: أدوات/مكائن. ADMIN فقط: تصنيفات — انظر docs/SECURITY.md */

function missingIfZero(
  count: number,
  message: string,
): ActionResult | null {
  if (count === 0) return { success: false, message };
  return null;
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
    const updated = await prisma.category.updateMany({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
      data: { name: data.name },
    });
    const missing = missingIfZero(updated.count, "التصنيف غير موجود");
    if (missing) return missing;
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

    const activeItems = await prisma.item.count({
      where: {
        categoryId: id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
    });
    if (activeItems > 0) {
      return {
        success: false,
        message: "لا يمكن حذف تصنيف مرتبط بأدوات نشطة — انقل الأدوات أولاً",
      };
    }

    const deleted = await prisma.category.updateMany({
      where: {
        id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    const missing = missingIfZero(deleted.count, "التصنيف غير موجود");
    if (missing) return missing;
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
    const updated = await prisma.machine.updateMany({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
      data: { name: data.name, location: data.location || null },
    });
    const missing = missingIfZero(updated.count, "المكينة غير موجودة");
    if (missing) return missing;
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
    const deleted = await prisma.machine.updateMany({
      where: {
        id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    const missing = missingIfZero(deleted.count, "المكينة غير موجودة");
    if (missing) return missing;
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

    await createTransaction(
      {
        type: "ADDITION",
        name: data.name,
        code: data.code,
        categoryId: data.categoryId,
        quantity: data.quantity,
        notes: data.notes || "إضافة عبر إدارة الأدوات",
      },
      profile,
    );

    revalidatePath("/items");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
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

    const updated = await prisma.item.updateMany({
      where: { id, organizationId: profile.organizationId, deletedAt: null },
      data: {
        name: data.name,
        code: data.code || null,
        categoryId: data.categoryId,
        quantity: data.quantity,
        notes: data.notes || null,
      },
    });
    const missing = missingIfZero(updated.count, "الأداة غير موجودة");
    if (missing) return missing;
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
    const deleted = await prisma.item.updateMany({
      where: {
        id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    const missing = missingIfZero(deleted.count, "الأداة غير موجودة");
    if (missing) return missing;
    revalidatePath("/items");
    bustItemOptionsCache(profile.organizationId);
    return { success: true, message: "تم حذف الأداة" };
  } catch (error) {
    return toActionError(error);
  }
}

/** بحث خفيف لفلاتر الأدوات — لا يجلب 500 صفاً للعميل */
export async function searchItemFilterOptionsAction(
  query: string,
): Promise<Array<{ id: string; name: string; code: string | null }>> {
  try {
    const { profile } = await requireUser();
    const limited = await guardRate(`item-filter:${profile.id}`, 60);
    if (limited) return [];
    const { searchItemFilterOptions } = await import("@/services/catalog");
    return searchItemFilterOptions(profile.organizationId, query, 40);
  } catch {
    return [];
  }
}
