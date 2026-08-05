import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

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
