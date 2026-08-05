import { prisma } from "@/lib/db";

export type ItemFilterOption = {
  id: string;
  name: string;
  code: string | null;
};

/** تصنيفات للإدارة (مع عدد الأدوات النشطة) */
export async function listCategories(organizationId: string) {
  return prisma.category.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
  });
}

/** مكائن للإدارة (مع الموقع) */
export async function listMachines(organizationId: string) {
  return prisma.machine.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
}

/** بحث خيارات فلتر الأدوات — محدود، للـ combobox من الخادم */
export async function searchItemFilterOptions(
  organizationId: string,
  query?: string,
  limit = 40,
): Promise<ItemFilterOption[]> {
  const q = query?.trim() ?? "";
  const take = Math.min(Math.max(limit, 1), 80);

  return prisma.item.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { code: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
    take,
  });
}

/** خيار واحد لعرض التسمية عند فتح صفحة بفلتر مسبق */
export async function getItemFilterOptionById(
  organizationId: string,
  itemId: string,
): Promise<ItemFilterOption | null> {
  return prisma.item.findFirst({
    where: { id: itemId, organizationId, deletedAt: null },
    select: { id: true, name: true, code: true },
  });
}
