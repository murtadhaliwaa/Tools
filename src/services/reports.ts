import { prisma } from "@/lib/db";
import type { ItemWithStatus } from "@/services/items";
import { getItemStatusById } from "@/services/items";
import { deriveItemStatus } from "@/services/item-status";
import type { TransactionType } from "@/generated/prisma/client";

export const REPORT_ROW_LIMIT = 2000;

export async function getMachineReport(params: {
  organizationId: string;
  machineId: string;
  from?: Date;
  to?: Date;
}) {
  const rows = await prisma.transaction.findMany({
    where: {
      organizationId: params.organizationId,
      machineId: params.machineId,
      type: "ISSUE",
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: REPORT_ROW_LIMIT,
    select: {
      id: true,
      createdAt: true,
      notes: true,
      item: { select: { id: true, name: true, code: true } },
      performedBy: { select: { fullName: true } },
    },
  });

  return {
    rows,
    truncated: rows.length >= REPORT_ROW_LIMIT,
    limit: REPORT_ROW_LIMIT,
  };
}

/** أدوات تحت التصليح فقط — استعلام مباشر بدون جلب كل المخزون */
export async function getRepairStatusReport(
  organizationId: string,
  options?: { page?: number; pageSize?: number },
) {
  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(Math.max(options?.pageSize ?? 50, 1), 100);
  const offset = (page - 1) * pageSize;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      code: string | null;
      quantity: number;
      notes: string | null;
      category_id: string;
      category_name: string;
      created_at: Date;
      last_type: string;
      last_at: Date;
      machine_id: string | null;
      machine_name: string | null;
      total_count: bigint;
    }>
  >`
    WITH repaired AS (
      SELECT
        i.id,
        i.name,
        i.code,
        i.quantity,
        i.notes,
        i."categoryId" AS category_id,
        c.name AS category_name,
        i."createdAt" AS created_at,
        t.type AS last_type,
        t."createdAt" AS last_at,
        t."machineId" AS machine_id,
        m.name AS machine_name
      FROM "Item" i
      INNER JOIN "Category" c ON c.id = i."categoryId"
      INNER JOIN LATERAL (
        SELECT tr.type, tr."createdAt", tr."machineId"
        FROM "Transaction" tr
        WHERE tr."itemId" = i.id
        ORDER BY tr."createdAt" DESC
        LIMIT 1
      ) t ON true
      LEFT JOIN "Machine" m ON m.id = t."machineId"
      WHERE i."organizationId" = ${organizationId}
        AND i."deletedAt" IS NULL
        AND t.type = 'SEND_TO_REPAIR'
    )
    SELECT *, COUNT(*) OVER()::bigint AS total_count
    FROM repaired
    ORDER BY last_at ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const total = Number(rows[0]?.total_count ?? 0);

  return {
    rows: rows.map((row) => {
      const status = deriveItemStatus(
        row.last_type as TransactionType,
        Number(row.quantity ?? 1),
      );
      const item: ItemWithStatus & { since: Date } = {
        id: row.id,
        name: row.name,
        code: row.code,
        quantity: Number(row.quantity ?? 1),
        notes: row.notes,
        categoryId: row.category_id,
        categoryName: row.category_name,
        createdAt: row.created_at,
        status,
        machineId: null,
        machineName: null,
        lastTransactionAt: row.last_at,
        lastTransactionType: row.last_type,
        since: row.last_at,
      };
      return item;
    }),
    total,
    page,
    pageSize,
  };
}

export async function getMonthlySummary(params: {
  organizationId: string;
  year: number;
  month: number;
}) {
  const from = new Date(params.year, params.month - 1, 1);
  const to = new Date(params.year, params.month, 0, 23, 59, 59);

  const [byTypeRows, byCategoryRows, totalRow] = await Promise.all([
    prisma.$queryRaw<Array<{ type: string; count: bigint }>>`
      SELECT type::text AS type, COUNT(*)::bigint AS count
      FROM "Transaction"
      WHERE "organizationId" = ${params.organizationId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY type
    `,
    prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
      SELECT c.name AS name, COUNT(*)::bigint AS count
      FROM "Transaction" t
      INNER JOIN "Item" i ON i.id = t."itemId"
      INNER JOIN "Category" c ON c.id = i."categoryId"
      WHERE t."organizationId" = ${params.organizationId}
        AND t."createdAt" >= ${from}
        AND t."createdAt" <= ${to}
      GROUP BY c.name
      ORDER BY count DESC
    `,
    prisma.transaction.count({
      where: {
        organizationId: params.organizationId,
        createdAt: { gte: from, lte: to },
      },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeRows) {
    byType[row.type] = Number(row.count);
  }

  const byCategory: Record<string, number> = {};
  for (const row of byCategoryRows) {
    byCategory[row.name] = Number(row.count);
  }

  return { total: totalRow, byType, byCategory, from, to };
}

export async function getItemTimeline(params: {
  organizationId: string;
  itemId: string;
}) {
  return prisma.transaction.findMany({
    where: {
      organizationId: params.organizationId,
      itemId: params.itemId,
    },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: {
      id: true,
      type: true,
      notes: true,
      createdAt: true,
      machine: { select: { name: true } },
      performedBy: { select: { fullName: true } },
    },
  });
}

/** تقرير مادة معينة: الحالة الحالية + الحركات خلال فترة */
export async function getMaterialReport(params: {
  organizationId: string;
  itemId: string;
  from?: Date;
  to?: Date;
}) {
  const item = await getItemStatusById(params.itemId, params.organizationId);
  if (!item) return null;

  const dateFilter =
    params.from || params.to
      ? {
          createdAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {};

  const where = {
    organizationId: params.organizationId,
    itemId: params.itemId,
    ...dateFilter,
  };

  const [rows, byTypeRows] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: REPORT_ROW_LIMIT,
      select: {
        id: true,
        type: true,
        notes: true,
        createdAt: true,
        machine: { select: { name: true } },
        performedBy: { select: { fullName: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ["type"],
      where,
      _count: { _all: true },
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeRows) {
    byType[row.type] = row._count._all;
  }

  return {
    item,
    rows,
    byType,
    truncated: rows.length >= REPORT_ROW_LIMIT,
    limit: REPORT_ROW_LIMIT,
  };
}

/** أكثر الأدوات صرفاً (ISSUE) — للرسم البياني */
export async function getTopIssuedItems(
  organizationId: string,
  limit = 8,
): Promise<Array<{ name: string; value: number }>> {
  const rows = await     prisma.$queryRaw<Array<{ name: string; value: bigint }>>`
    SELECT i.name AS name, COUNT(*)::bigint AS value
    FROM "Transaction" t
    INNER JOIN "Item" i ON i.id = t."itemId"
    WHERE t."organizationId" = ${organizationId}
      AND t.type = 'ISSUE'
      AND i."deletedAt" IS NULL
    GROUP BY i.id, i.name
    ORDER BY value DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
}
