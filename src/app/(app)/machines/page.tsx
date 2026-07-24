import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MachinesManager } from "@/components/catalog/machines-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";

export default async function MachinesPage() {
  const { profile } = await requireUser();

  const machines = await prisma.machine.findMany({
    where: { organizationId: profile.organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });

  return (
    <PageShell>
      <PageHeader title="المكائن" description="إدارة مكائن الورشة" />
      <MachinesManager machines={machines} />
    </PageShell>
  );
}
