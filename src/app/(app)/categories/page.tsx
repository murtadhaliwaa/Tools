import { requireAdminPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CategoriesManager } from "@/components/catalog/categories-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function CategoriesPage() {
  const { profile } = await requireAdminPage();

  const categories = await prisma.category.findMany({
    where: { organizationId: profile.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { items: { where: { deletedAt: null } } } },
    },
  });

  return (
    <PageShell>
      <PageHeader
        title="التصنيفات"
        description="إدارة تصنيفات الأدوات"
      />
      <CategoriesManager categories={categories} />
    </PageShell>
  );
}
