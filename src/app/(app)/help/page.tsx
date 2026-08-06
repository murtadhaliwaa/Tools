import { requireAdminPage } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { AdminHelpContent } from "@/components/help/admin-help-content";

export default async function HelpPage() {
  await requireAdminPage();

  return (
    <PageShell>
      <PageHeader
        title="المساعدة"
        description="أسئلة شائعة لتقليل الأخطاء وطلبات الدعم"
      />
      <AdminHelpContent />
    </PageShell>
  );
}
