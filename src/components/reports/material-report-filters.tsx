"use client";

import { EntityDateReportFilters } from "@/components/reports/entity-date-report-filters";

type Option = { id: string; name: string; code?: string | null };

export function MaterialReportFilters({
  items,
  initial,
}: {
  items: Option[];
  initial: { itemId?: string; from?: string; to?: string };
}) {
  return (
    <EntityDateReportFilters
      basePath="/reports/material"
      entityKey="itemId"
      entityLabel="المادة"
      options={items}
      initial={{
        entityId: initial.itemId,
        from: initial.from,
        to: initial.to,
      }}
      searchPlaceholder="ابحث بالاسم أو الرمز..."
    />
  );
}
