import { prisma } from "@/lib/db";
import { deriveItemStatus } from "@/services/item-status";
import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";
import { Prisma, type TransactionType } from "@/generated/prisma/client";

export type ItemWithStatus = {
  id: string;
  name: string;
  code: string | null;
  quantity: number;
  notes: string | null;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  status: ItemStatusType;
  machineId: string | null;
  machineName: string | null;
  lastTransactionAt: Date | null;
  lastTransactionType: string | null;
};

type ItemStatusRow = {
  id: string;
  name: string;
  code: string | null;
  quantity: number;
  notes: string | null;
  category_id: string;
  category_name: string;
  created_at: Date;
  last_type: string | null;
  last_at: Date | null;
  machine_id: string | null;
  machine_name: string | null;
  total_count?: bigint;
};

function mapRow(row: ItemStatusRow): ItemWithStatus {
  const quantity = Number(row.quantity ?? 1);
  const derived = deriveItemStatus(
    row.last_type as TransactionType | null,
    quantity,
  );
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    quantity,
    notes: row.notes,
    categoryId: row.category_id,
    categoryName: row.category_name,
    createdAt: row.created_at,
    status: derived,
    machineId: derived === ItemStatus.ISSUED ? row.machine_id : null,
    machineName: derived === ItemStatus.ISSUED ? row.machine_name : null,
    lastTransactionAt: row.last_at,
    lastTransactionType: row.last_type,
  };
}

function statusFilterSql(status?: ItemStatusType) {
  if (status === ItemStatus.ISSUED) {
    return Prisma.sql`AND COALESCE(t.type, '') <> 'SEND_TO_REPAIR' AND i.quantity <= 0`;
  }
  if (status === ItemStatus.IN_REPAIR) {
    return Prisma.sql`AND t.type = 'SEND_TO_REPAIR'`;
  }
  if (status === ItemStatus.AVAILABLE) {
    return Prisma.sql`AND COALESCE(t.type, '') <> 'SEND_TO_REPAIR' AND i.quantity > 0`;
  }
  return Prisma.empty;
}

export type ItemsListParams = {
  organizationId: string;
  categoryId?: string;
  status?: ItemStatusType;
  search?: string;
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
  /** حد بدون ترقيم (نماذج) */
  take?: number;
};

/**
 * يجلب حالة الأدوات عبر آخر حركة (LATERAL) — مع ترقيم صفحات في SQL.
 */
export async function getItemsWithStatus(
  params: ItemsListParams,
): Promise<ItemWithStatus[]> {
  const result = await listItemsWithStatus(params);
  return result.rows;
}

export async function listItemsWithStatus(params: ItemsListParams): Promise<{
  rows: ItemWithStatus[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const {
    organizationId,
    categoryId,
    status,
    search,
    includeDeleted,
    take,
  } = params;

  const pageSize = Math.min(
    take && take > 0 ? take : (params.pageSize ?? 40),
    100,
  );
  const page = Math.max(1, params.page ?? 1);
  const offset = (page - 1) * pageSize;
  const q = search?.trim() || null;

  const rows = await prisma.$queryRaw<(ItemStatusRow & { total_count: bigint })[]>`
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
      m.name AS machine_name,
      COUNT(*) OVER()::bigint AS total_count
    FROM "Item" i
    INNER JOIN "Category" c ON c.id = i."categoryId"
    LEFT JOIN LATERAL (
      SELECT tr.type, tr."createdAt", tr."machineId"
      FROM "Transaction" tr
      WHERE tr."itemId" = i.id
      ORDER BY tr."createdAt" DESC
      LIMIT 1
    ) t ON true
    LEFT JOIN "Machine" m ON m.id = t."machineId"
    WHERE i."organizationId" = ${organizationId}
      AND (${includeDeleted ?? false} OR i."deletedAt" IS NULL)
      AND (${categoryId ?? null}::text IS NULL OR i."categoryId" = ${categoryId ?? null})
      AND (
        ${q}::text IS NULL
        OR i.name ILIKE '%' || ${q} || '%'
        OR COALESCE(i.code, '') ILIKE '%' || ${q} || '%'
      )
      ${statusFilterSql(status)}
    ORDER BY i.name ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;

  const total = Number(rows[0]?.total_count ?? 0);
  return {
    rows: rows.map(mapRow),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

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
): Promise<TransactionFormItem[]> {
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
    ORDER BY i.name ASC
    LIMIT 800
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

/** حالة أداة واحدة فقط — بدون جلب كل المخزون */
export async function getItemStatusById(
  itemId: string,
  organizationId: string,
): Promise<ItemWithStatus | null> {
  const rows = await prisma.$queryRaw<ItemStatusRow[]>`
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
    LEFT JOIN LATERAL (
      SELECT tr.type, tr."createdAt", tr."machineId"
      FROM "Transaction" tr
      WHERE tr."itemId" = i.id
      ORDER BY tr."createdAt" DESC
      LIMIT 1
    ) t ON true
    LEFT JOIN "Machine" m ON m.id = t."machineId"
    WHERE i.id = ${itemId}
      AND i."organizationId" = ${organizationId}
      AND i."deletedAt" IS NULL
    LIMIT 1
  `;

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getDashboardStats(organizationId: string) {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totals, monthTransactions] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        total_items: bigint;
        available: bigint;
        issued: bigint;
        in_repair: bigint;
      }>
    >`
      WITH latest AS (
        SELECT DISTINCT ON (tr."itemId")
          tr."itemId",
          tr.type
        FROM "Transaction" tr
        WHERE tr."organizationId" = ${organizationId}
        ORDER BY tr."itemId", tr."createdAt" DESC
      )
      SELECT
        COUNT(*)::bigint AS total_items,
        COUNT(*) FILTER (
          WHERE COALESCE(l.type, '') <> 'SEND_TO_REPAIR'
            AND i.quantity > 0
        )::bigint AS available,
        COUNT(*) FILTER (
          WHERE COALESCE(l.type, '') <> 'SEND_TO_REPAIR'
            AND i.quantity <= 0
        )::bigint AS issued,
        COUNT(*) FILTER (WHERE l.type = 'SEND_TO_REPAIR')::bigint AS in_repair
      FROM "Item" i
      LEFT JOIN latest l ON l."itemId" = i.id
      WHERE i."organizationId" = ${organizationId}
        AND i."deletedAt" IS NULL
    `,
    prisma.transaction.count({
      where: {
        organizationId,
        createdAt: { gte: startOfMonth },
      },
    }),
  ]);

  const row = totals[0];
  return {
    totalItems: Number(row?.total_items ?? 0),
    available: Number(row?.available ?? 0),
    issued: Number(row?.issued ?? 0),
    inRepair: Number(row?.in_repair ?? 0),
    monthTransactions,
  };
}

export async function getRecentTransactions(
  organizationId: string,
  take = 10,
) {
  return prisma.transaction.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      notes: true,
      createdAt: true,
      item: { select: { id: true, name: true, code: true } },
      machine: { select: { id: true, name: true } },
      performedBy: { select: { id: true, fullName: true } },
    },
  });
}

export type TransactionListFilters = {
  organizationId: string;
  type?: string;
  itemId?: string;
  machineId?: string;
  performedById?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export async function listTransactions(filters: TransactionListFilters) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 20, 100);
  const skip = (page - 1) * pageSize;

  const where: Prisma.TransactionWhereInput = {
    organizationId: filters.organizationId,
    ...(filters.type
      ? { type: filters.type as Prisma.EnumTransactionTypeFilter["equals"] }
      : {}),
    ...(filters.itemId ? { itemId: filters.itemId } : {}),
    ...(filters.machineId ? { machineId: filters.machineId } : {}),
    ...(filters.performedById ? { performedById: filters.performedById } : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        notes: true,
        createdAt: true,
        item: { select: { id: true, name: true, code: true } },
        machine: { select: { id: true, name: true } },
        performedBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
