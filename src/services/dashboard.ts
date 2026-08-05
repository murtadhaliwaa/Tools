import { prisma } from "@/lib/db";

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
          WHERE (l.type IS NULL OR l.type <> 'SEND_TO_REPAIR')
            AND i.quantity > 0
        )::bigint AS available,
        COUNT(*) FILTER (
          WHERE (l.type IS NULL OR l.type <> 'SEND_TO_REPAIR')
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
