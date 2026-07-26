import { getItemStatusById } from "@/services/items";
import { deriveItemStatus, quantityDeltaOnDelete } from "@/services/item-status";
import { ItemStatus } from "@/types/domain";
import type { Profile, TransactionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import {
  createTransactionSchema,
  type CreateTransactionInput,
} from "@/lib/validations";

export { quantityDeltaOnDelete } from "@/services/item-status";

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
          quantity: data.quantity,
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

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.itemId}))`;

    const item = await tx.item.findFirst({
      where: {
        id: data.itemId,
        organizationId,
        deletedAt: null,
      },
      select: { id: true, quantity: true },
    });

    if (!item) {
      throw new Error("الأداة غير موجودة");
    }

    const last = await tx.transaction.findFirst({
      where: { itemId: data.itemId },
      orderBy: { createdAt: "desc" },
      select: { type: true },
    });

    const status = deriveItemStatus(
      last?.type as TransactionType | null,
      item.quantity,
    );

    if (data.type === "ISSUE") {
      if (status === ItemStatus.IN_REPAIR) {
        throw new Error("لا يمكن صرف أداة تحت التصليح");
      }
      if (item.quantity < 1) {
        throw new Error("لا يوجد رصيد متاح لهذه المادة");
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

      await tx.item.update({
        where: { id: item.id },
        data: { quantity: { decrement: 1 } },
      });

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

    if (data.type === "RETURN_FROM_MACHINE") {
      const issuedNet = await tx.transaction.groupBy({
        by: ["type"],
        where: {
          itemId: data.itemId,
          type: { in: ["ISSUE", "RETURN_FROM_MACHINE"] },
        },
        _count: { _all: true },
      });
      const issueCount =
        issuedNet.find((r) => r.type === "ISSUE")?._count._all ?? 0;
      const returnCount =
        issuedNet.find((r) => r.type === "RETURN_FROM_MACHINE")?._count
          ._all ?? 0;
      if (issueCount <= returnCount) {
        throw new Error("لا توجد كميات مصروفة لإرجاعها");
      }
      if (status === ItemStatus.IN_REPAIR) {
        throw new Error("لا يمكن الإرجاع أثناء وجود الأداة تحت التصليح");
      }

      await tx.item.update({
        where: { id: item.id },
        data: { quantity: { increment: 1 } },
      });

      return tx.transaction.create({
        data: {
          organizationId,
          type: "RETURN_FROM_MACHINE",
          itemId: data.itemId,
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

export async function assertItemAccessible(
  itemId: string,
  organizationId: string,
) {
  const current = await getItemStatusById(itemId, organizationId);
  if (!current) throw new Error("الأداة غير موجودة");
  return current;
}

type TxClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

/** يعكس كمية الصنف بعد حذف آخر حركة (داخل معاملة موجودة) */
export async function reverseQuantityAfterDelete(
  tx: TxClient,
  input: {
    itemId: string;
    organizationId: string;
    type: TransactionType;
  },
) {
  const delta = quantityDeltaOnDelete(input.type);
  if (delta === 0) return;

  if (delta > 0) {
    await tx.item.updateMany({
      where: {
        id: input.itemId,
        organizationId: input.organizationId,
        deletedAt: null,
      },
      data: { quantity: { increment: delta } },
    });
    return;
  }

  await tx.$executeRaw`
    UPDATE "Item"
    SET quantity = GREATEST(0, quantity - 1)
    WHERE id = ${input.itemId}
      AND "organizationId" = ${input.organizationId}
      AND "deletedAt" IS NULL
  `;
}
