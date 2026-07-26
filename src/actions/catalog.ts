"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { bustCatalogCache, bustItemOptionsCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { categorySchema, itemSchema, machineSchema } from "@/lib/validations";
import { type ActionResult, toActionError } from "@/actions/shared";

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

    await prisma.category.updateMany({
      where: {
        id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
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

    await prisma.machine.updateMany({
      where: {
        id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
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

    await prisma.item.updateMany({
      where: {
        id,
        organizationId: profile.organizationId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/items");
    bustItemOptionsCache(profile.organizationId);
    return { success: true, message: "تم حذف الأداة" };
  } catch (error) {
    return toActionError(error);
  }
}
