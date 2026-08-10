import { prisma } from "@/lib/db";
import { deriveItemStatus } from "@/services/item-status";
import { isLowStock } from "@/lib/stock";
import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";
import { Prisma, type TransactionType } from "@/generated/prisma/client";

export type ItemWithStatus = {
  id: string;
  name: string;
  code: string | null;
  quantity: number;
  minQuantity: number;
  notes: string | null;
  categoryId: string;
  categoryName: string;
  createdAt: Date;
  status: ItemStatusType;
  lowStock: boolean;
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
  min_quantity: number;
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
  const minQuantity = Number(row.min_quantity ?? 0);
  const derived = deriveItemStatus(
    row.last_type as TransactionType | null,
    quantity,
  );
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    quantity,
    minQuantity,
    notes: row.notes,
    categoryId: row.category_id,
    categoryName: row.category_name,
    createdAt: row.created_at,
    status: derived,
    lowStock: isLowStock(quantity, minQuantity),
    machineId: derived === ItemStatus.ISSUED ? row.machine_id : null,
    machineName: derived === ItemStatus.ISSUED ? row.machine_name : null,
    lastTransactionAt: row.last_at,
    lastTransactionType: row.last_type,
  };
}

function statusFilterSql(status?: ItemStatusType) {
  if (status === ItemStatus.ISSUED) {
    return Prisma.sql`AND (t.type IS NULL OR t.type <> 'SEND_TO_REPAIR') AND i.quantity <= 0`;
  }
  if (status === ItemStatus.IN_REPAIR) {
    return Prisma.sql`AND t.type = 'SEND_TO_REPAIR'`;
  }
  if (status === ItemStatus.AVAILABLE) {
    return Prisma.sql`AND (t.type IS NULL OR t.type <> 'SEND_TO_REPAIR') AND i.quantity > 0`;
  }
  return Prisma.empty;
}

function stockFilterSql(stock?: "low") {
  if (stock === "low") {
    return Prisma.sql`AND i."minQuantity" > 0 AND i.quantity <= i."minQuantity"`;
  }
  return Prisma.empty;
}

export type ItemsListParams = {
  organizationId: string;
  categoryId?: string;
  status?: ItemStatusType;
  /** فلتر منفصل عن الحالة: مواد عند/تحت الحد الأدنى */
  stock?: "low";
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
    stock,
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
      i."minQuantity" AS min_quantity,
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
      ${stockFilterSql(stock)}
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
