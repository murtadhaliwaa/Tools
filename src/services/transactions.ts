import { prisma } from "@/lib/db";
import {
  createTransactionSchema,
  type CreateTransactionInput,
} from "@/lib/validations";
import { getItemStatusById } from "@/services/items";
import { deriveItemStatus } from "@/services/item-status";
import { ItemStatus } from "@/types/domain";
import type { Profile, TransactionType } from "@/generated/prisma/client";

export async function createTransaction(
  input: CreateTransactionInput,
  profile: Profile,
) {
  const data = createTransactionSchema.parse(input);
  const organizationId = profile.organizationId;

  if (data.type === "ADDITION") {
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!category) {
      throw new Error("التصنيف غير موجود");
    }

    return prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          organizationId,
          name: data.name,
          code: data.code || null,
          categoryId: data.categoryId,
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          organizationId,
          type: "ADDITION",
          itemId: item.id,
          notes: data.notes || null,
          performedById: profile.id,
        },
      });

      return { item, transaction };
    });
  }

  // ISSUE / SEND_TO_REPAIR / RETURN_FROM_REPAIR مع قفل استشاري لمنع السباق
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.itemId}))`;

    const item = await tx.item.findFirst({
      where: {
        id: data.itemId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!item) {
      throw new Error("الأداة غير موجودة");
    }

    const last = await tx.transaction.findFirst({
      where: { itemId: data.itemId },
      orderBy: { createdAt: "desc" },
      select: { type: true },
    });

    const status = deriveItemStatus(last?.type as TransactionType | null);

    if (data.type === "ISSUE") {
      if (status !== ItemStatus.AVAILABLE) {
        throw new Error("لا يمكن صرف الأداة إلا إذا كانت متوفرة");
      }

      const machine = await tx.machine.findFirst({
        where: {
          id: data.machineId,
          organizationId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!machine) {
        throw new Error("المكينة غير موجودة");
      }

      return tx.transaction.create({
        data: {
          organizationId,
          type: "ISSUE",
          itemId: data.itemId,
          machineId: data.machineId,
          notes: data.notes || null,
          performedById: profile.id,
        },
      });
    }

    if (data.type === "SEND_TO_REPAIR") {
      if (status === ItemStatus.IN_REPAIR) {
        throw new Error("الأداة بالفعل تحت التصليح");
      }

      return tx.transaction.create({
        data: {
          organizationId,
          type: "SEND_TO_REPAIR",
          itemId: data.itemId,
          notes: data.notes || null,
          performedById: profile.id,
        },
      });
    }

    if (status !== ItemStatus.IN_REPAIR) {
      throw new Error("لا يمكن إرجاع أداة ليست تحت التصليح");
    }

    return tx.transaction.create({
      data: {
        organizationId,
        type: "RETURN_FROM_REPAIR",
        itemId: data.itemId,
        notes: data.notes || null,
        performedById: profile.id,
      },
    });
  });
}

/** يُستخدم خارج المعاملة عند الحاجة للتحقق السريع فقط */
export async function assertItemAccessible(
  itemId: string,
  organizationId: string,
) {
  const current = await getItemStatusById(itemId, organizationId);
  if (!current) throw new Error("الأداة غير موجودة");
  return current;
}

