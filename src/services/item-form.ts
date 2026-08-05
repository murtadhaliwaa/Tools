import { prisma } from "@/lib/db";
import { deriveItemStatus } from "@/services/item-status";
import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";
import type { TransactionType } from "@/generated/prisma/client";

/** حقول خفيفة لنموذج الحركة — أقل JSON يُرسل للعميل */
export type TransactionFormItem = {
  id: string;
  name: string;
  code: string | null;
  categoryName: string;
  status: ItemStatusType;
  machineName: string | null;
  /** هل توجد كميات مصروفة لم تُرجع بعد */
  hasOutstandingIssue: boolean;
};

export async function getItemsForTransactionForm(
  organizationId: string,
  options?: { query?: string; limit?: number },
): Promise<TransactionFormItem[]> {
  const query = options?.query?.trim() ?? "";
  const limit = Math.min(Math.max(options?.limit ?? 40, 1), 80);
  const pattern = query ? `%${query}%` : "%";

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      code: string | null;
      quantity: number;
      category_name: string;
      last_type: string | null;
      machine_name: string | null;
      outstanding: bigint;
    }>
  >`
    SELECT
      i.id,
      i.name,
      i.code,
      i.quantity,
      c.name AS category_name,
      t.type AS last_type,
      m.name AS machine_name,
      (
        SELECT COUNT(*) FILTER (WHERE tr.type = 'ISSUE')
             - COUNT(*) FILTER (WHERE tr.type = 'RETURN_FROM_MACHINE')
        FROM "Transaction" tr
        WHERE tr."itemId" = i.id
      )::bigint AS outstanding
    FROM "Item" i
    INNER JOIN "Category" c ON c.id = i."categoryId"
    LEFT JOIN LATERAL (
      SELECT tr.type, tr."machineId"
      FROM "Transaction" tr
      WHERE tr."itemId" = i.id
      ORDER BY tr."createdAt" DESC
      LIMIT 1
    ) t ON true
    LEFT JOIN "Machine" m ON m.id = t."machineId"
    WHERE i."organizationId" = ${organizationId}
      AND i."deletedAt" IS NULL
      AND (
        i.name ILIKE ${pattern}
        OR COALESCE(i.code, '') ILIKE ${pattern}
      )
    ORDER BY i.name ASC
    LIMIT ${limit}
  `;

  return rows.map((row) => {
    const quantity = Number(row.quantity ?? 1);
    const status = deriveItemStatus(
      row.last_type as TransactionType | null,
      quantity,
    );
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      categoryName: row.category_name,
      status,
      machineName: status === ItemStatus.ISSUED ? row.machine_name : null,
      hasOutstandingIssue: Number(row.outstanding ?? 0) > 0,
    };
  });
}
