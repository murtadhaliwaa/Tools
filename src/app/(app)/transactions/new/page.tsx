import { requireUser } from "@/lib/auth";
import {
  getCategoriesCached,
  getMachinesCached,
  getFormItemsCached,
} from "@/lib/cache";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function NewTransactionPage() {
  const { profile } = await requireUser();
  const [categories, machines, items] = await Promise.all([
    getCategoriesCached(profile.organizationId),
    getMachinesCached(profile.organizationId),
    getFormItemsCached(profile.organizationId),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="تسجيل حركة"
        description="صرف، إضافة، تصليح، أو رجوع من التصليح"
      />
      <TransactionForm
        categories={categories}
        machines={machines}
        items={items}
      />
    </PageShell>
  );
}
