"use client";

import { EntityDateReportFilters } from "@/components/reports/entity-date-report-filters";

type Option = { id: string; name: string };

export function MachineReportFilters({
  machines,
  initial,
}: {
  machines: Option[];
  initial: { machineId?: string; from?: string; to?: string };
}) {
  return (
    <EntityDateReportFilters
      basePath="/reports/machine"
      entityKey="machineId"
      entityLabel="المكينة"
      options={machines}
      initial={{
        entityId: initial.machineId,
        from: initial.from,
        to: initial.to,
      }}
      searchPlaceholder="ابحث عن مكينة..."
    />
  );
}
