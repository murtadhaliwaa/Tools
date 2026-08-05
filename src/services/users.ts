import { prisma } from "@/lib/db";

/** مستخدمو المؤسسة لصفحة الحسابات */
export async function listOrganizationUsers(organizationId: string) {
  return prisma.profile.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, role: true, isActive: true },
  });
}
