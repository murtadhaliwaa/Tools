"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { bustItemOptionsCache, bustReportsCache } from "@/lib/cache";
import { prisma } from "@/lib/db";
import {
  createTransactionSchema,
  updateTransactionNotesSchema,
} from "@/lib/validations";
import {
  createTransaction,
  reverseQuantityAfterDelete,
} from "@/services/transactions";
import type { ItemStatus } from "@/types/domain";
import { lowStockSeverity } from "@/lib/stock";
import { type ActionResult, guardRate, toActionError } from "@/actions/shared";

/** رسالة تنبيه فورية إن بلغت المادة حدّها الأدنى بعد الصرف */
async function lowStockWarning(
  itemId: string,
  organizationId: string,
): Promise<string | undefined> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId, deletedAt: null },
    select: { name: true, quantity: true, minQuantity: true },
  });
  if (!item) return undefined;

  const severity = lowStockSeverity(item.quantity, item.minQuantity);
  if (!severity) return undefined;

  return severity === "critical"
    ? `تنبيه: ${item.name} نفدت من المخزون`
    : `تنبيه: ${item.name} بلغت الحد الأدنى (المتبقي ${item.quantity} من حد ${item.minQuantity})`;
}

export async function searchTransactionItemsAction(
  query: string,
): Promise<
  {
    id: string;
    name: string;
    code: string | null;
    categoryName: string;
    quantity: number;
    status: ItemStatus;
    machineName: string | null;
    hasOutstandingIssue: boolean;
  }[]
> {
  try {
    const { profile } = await requireUser();
    const limited = await guardRate(`search-items:${profile.id}`, 60);
    if (limited) return [];
    const { getItemsForTransactionForm } = await import("@/services/item-form");
    return getItemsForTransactionForm(profile.organizationId, {
      query,
      limit: 40,
    });
  } catch {
    return [];
  }
}

export async function createTransactionAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const { profile } = await requireUser();
    const limited = await guardRate(`tx:${profile.id}`, 40);
    if (limited) return limited;
    const parsed = createTransactionSchema.parse(input);
    await createTransaction(parsed, profile);
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/items");
    revalidatePath("/reports");
    bustItemOptionsCache(profile.organizationId);
    bustReportsCache(profile.organizationId);

    const warning =
      parsed.type === "ISSUE"
        ? await lowStockWarning(parsed.itemId, profile.organizationId)
        : undefined;

    return { success: true, message: "تم تسجيل الحركة بنجاح", warning };
  } catch (error) {
    return toActionError(error);
  }
}

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

    await prisma.transaction.updateMany({
      where: { id, organizationId: profile.organizationId },
      data: { notes: data.notes || null },
    });
    revalidatePath("/transactions");
    revalidatePath("/reports");
    return { success: true, message: "تم تحديث الملاحظات" };
  } catch (error) {
    return toActionError(error);
  }
}

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

      await reverseQuantityAfterDelete(db, {
        itemId: tx.itemId,
        organizationId: profile.organizationId,
        type: tx.type,
        quantity: tx.quantity,
      });

      await db.transaction.deleteMany({
        where: { id, organizationId: profile.organizationId },
      });

      if (tx.type === "ADDITION") {
        const remaining = await db.transaction.count({
          where: { itemId: tx.itemId },
        });
        if (remaining === 0) {
          await db.item.updateMany({
            where: {
              id: tx.itemId,
              organizationId: profile.organizationId,
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
        }
      }
    });

    bustItemOptionsCache(profile.organizationId);
    bustReportsCache(profile.organizationId);
    revalidatePath("/transactions");
    revalidatePath("/items");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { success: true, message: "تم حذف الحركة" };
  } catch (error) {
    return toActionError(error);
  }
}
