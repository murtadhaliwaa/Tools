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
  quantity: number;
  status: ItemStatusType;
  machineName: string | null;
  /** هل توجد كميات مصروفة لم تُرجع بعد */
  hasOutstandingIssue: boolean;
};

/**
 * بحث أدوات لنموذج الحركة.
 * يحدّ المرشّحين أولاً (LIMIT) ثم يجمع outstanding مرة واحدة لتلك المعرّفات —
 * بدل استعلام فرعي مرتبط لكل صف على كامل تاريخ الحركات.
 */
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
    WITH matched AS (
      SELECT
        i.id,
        i.name,
        i.code,
        i.quantity,
        i."categoryId"
      FROM "Item" i
      WHERE i."organizationId" = ${organizationId}
        AND i."deletedAt" IS NULL
        AND (
          i.name ILIKE ${pattern}
          OR COALESCE(i.code, '') ILIKE ${pattern}
        )
      ORDER BY i.name ASC
      LIMIT ${limit}
    ),
    outstanding AS (
      SELECT
        tr."itemId",
        (
          COALESCE(SUM(tr.quantity) FILTER (WHERE tr.type = 'ISSUE'), 0)
          - COALESCE(SUM(tr.quantity) FILTER (WHERE tr.type = 'RETURN_FROM_MACHINE'), 0)
        )::bigint AS outstanding
      FROM "Transaction" tr
      INNER JOIN matched m ON m.id = tr."itemId"
      WHERE tr.type IN ('ISSUE', 'RETURN_FROM_MACHINE')
      GROUP BY tr."itemId"
    )
    SELECT
      m.id,
      m.name,
      m.code,
      m.quantity,
      c.name AS category_name,
      t.type AS last_type,
      mch.name AS machine_name,
      COALESCE(o.outstanding, 0)::bigint AS outstanding
    FROM matched m
    INNER JOIN "Category" c ON c.id = m."categoryId"
    LEFT JOIN LATERAL (
      SELECT tr.type, tr."machineId"
      FROM "Transaction" tr
      WHERE tr."itemId" = m.id
      ORDER BY tr."createdAt" DESC
      LIMIT 1
    ) t ON true
    LEFT JOIN "Machine" mch ON mch.id = t."machineId"
    LEFT JOIN outstanding o ON o."itemId" = m.id
    ORDER BY m.name ASC
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
      quantity,
      status,
      machineName: status === ItemStatus.ISSUED ? row.machine_name : null,
      hasOutstandingIssue: Number(row.outstanding ?? 0) > 0,
    };
  });
}
