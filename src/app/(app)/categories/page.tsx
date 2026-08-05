import { requireAdminPage } from "@/lib/auth";
import { getCategoriesAdminCached } from "@/lib/cache";
import { CategoriesManager } from "@/components/catalog/categories-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function CategoriesPage() {
  const { profile } = await requireAdminPage();
  const categories = await getCategoriesAdminCached(profile.organizationId);

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
