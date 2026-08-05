import { prisma } from "@/lib/db";

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
