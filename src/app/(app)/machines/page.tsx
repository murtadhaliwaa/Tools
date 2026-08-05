import { requireUser } from "@/lib/auth";
import { getMachinesAdminCached } from "@/lib/cache";
import { MachinesManager } from "@/components/catalog/machines-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function MachinesPage() {
  const { profile } = await requireUser();
  const machines = await getMachinesAdminCached(profile.organizationId);

  return (
    <PageShell>
      <PageHeader title="المكائن" description="إدارة مكائن الورشة" />
      <MachinesManager machines={machines} />
    </PageShell>
  );
}
