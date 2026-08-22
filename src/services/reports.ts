import { prisma } from "@/lib/db";
import type { ItemWithStatus } from "@/services/items";
import { getItemStatusById } from "@/services/items";
import { listItemsWithStatus } from "@/services/items";
import { deriveItemStatus } from "@/services/item-status";
import { isLowStock } from "@/lib/stock";
import type { ItemStatus } from "@/types/domain";
import type { TransactionType } from "@/generated/prisma/client";

/** حجم صفحة واجهة التقارير */
export const REPORT_PAGE_SIZE = 50;
/** سقف صفوف التصدير (Excel/PDF عبر Server Action) */
export const EXPORT_ROW_LIMIT = 2000;
/** سقف سجل أداة عند التصدير / العرض الافتراضي القديم */
export const TIMELINE_EXPORT_LIMIT = 500;

function clampPage(page?: number) {
  return Math.max(1, page ?? 1);
}

function clampPageSize(pageSize: number | undefined, max: number, fallback: number) {
  return Math.min(Math.max(pageSize ?? fallback, 1), max);
}

export async function getMachineReport(params: {
  organizationId: string;
  machineId: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(
    params.pageSize,
    EXPORT_ROW_LIMIT,
    REPORT_PAGE_SIZE,
  );

  const where = {
    organizationId: params.organizationId,
    machineId: params.machineId,
    type: "ISSUE" as const,
    ...(params.from || params.to
      ? {
          createdAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        notes: true,
        item: { select: { id: true, name: true, code: true } },
        performedBy: { select: { fullName: true } },
      },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    truncated: total > rows.length,
    limit: pageSize,
  };
}

/** أدوات تحت التصليح فقط — استعلام مباشر بدون جلب كل المخزون */
export async function getRepairStatusReport(
  organizationId: string,
  options?: { page?: number; pageSize?: number },
) {
  const page = clampPage(options?.page);
  const pageSize = clampPageSize(options?.pageSize, EXPORT_ROW_LIMIT, 50);
  const offset = (page - 1) * pageSize;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      name: string;
      code: string | null;
      quantity: number;
      min_quantity: number;
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
        i."minQuantity" AS min_quantity,
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
      const quantity = Number(row.quantity ?? 1);
      const minQuantity = Number(row.min_quantity ?? 0);
      const status = deriveItemStatus(
        row.last_type as TransactionType,
        quantity,
      );
      const item: ItemWithStatus & { since: Date } = {
        id: row.id,
        name: row.name,
        code: row.code,
        quantity,
        minQuantity,
        notes: row.notes,
        categoryId: row.category_id,
        categoryName: row.category_name,
        createdAt: row.created_at,
        status,
        lowStock: isLowStock(quantity, minQuantity),
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
  page?: number;
  pageSize?: number;
}) {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(
    params.pageSize,
    TIMELINE_EXPORT_LIMIT,
    REPORT_PAGE_SIZE,
  );
  const where = {
    organizationId: params.organizationId,
    itemId: params.itemId,
  };

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        notes: true,
        createdAt: true,
        machine: { select: { name: true } },
        performedBy: { select: { fullName: true } },
      },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    truncated: total > rows.length,
    limit: pageSize,
  };
}

/** تقرير مادة معينة: الحالة الحالية + الحركات خلال فترة */
export async function getMaterialReport(params: {
  organizationId: string;
  itemId: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const item = await getItemStatusById(params.itemId, params.organizationId);
  if (!item) return null;

  const page = clampPage(params.page);
  const pageSize = clampPageSize(
    params.pageSize,
    EXPORT_ROW_LIMIT,
    REPORT_PAGE_SIZE,
  );

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

  const [total, rows, byTypeRows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    truncated: total > rows.length,
    limit: pageSize,
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

/** جرد المخزون — كل المواد النشطة ورصيدها الحالي */
export async function getInventoryReport(params: {
  organizationId: string;
  categoryId?: string;
  status?: ItemStatus;
  stock?: "low";
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = clampPageSize(
    params.pageSize,
    EXPORT_ROW_LIMIT,
    REPORT_PAGE_SIZE,
  );
  const result = await listItemsWithStatus({
    organizationId: params.organizationId,
    categoryId: params.categoryId,
    status: params.status,
    stock: params.stock,
    search: params.search,
    page: params.page,
    pageSize,
  });
  const totalQuantity = result.rows.reduce((sum, row) => sum + row.quantity, 0);
  return {
    ...result,
    totalQuantity,
    truncated: result.total > result.rows.length,
    limit: pageSize,
  };
}

/** تقرير الصرف — كل حركات ISSUE في فترة (أسبوع أو مخصص) */
export async function getIssuesReport(params: {
  organizationId: string;
  from?: Date;
  to?: Date;
  machineId?: string;
  itemId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = clampPage(params.page);
  const pageSize = clampPageSize(
    params.pageSize,
    EXPORT_ROW_LIMIT,
    REPORT_PAGE_SIZE,
  );

  const where = {
    organizationId: params.organizationId,
    type: "ISSUE" as const,
    ...(params.machineId ? { machineId: params.machineId } : {}),
    ...(params.itemId ? { itemId: params.itemId } : {}),
    ...(params.from || params.to
      ? {
          createdAt: {
            ...(params.from ? { gte: params.from } : {}),
            ...(params.to ? { lte: params.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        createdAt: true,
        quantity: true,
        notes: true,
        item: { select: { id: true, name: true, code: true } },
        machine: { select: { id: true, name: true } },
        performedBy: { select: { fullName: true } },
      },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    truncated: total > rows.length,
    limit: pageSize,
  };
}
