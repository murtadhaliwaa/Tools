"use client";

import { useMemo, useState } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { LoadingButton } from "@/components/shared/loading-button";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string };

export function MachineReportFilters({
  machines,
  initial,
}: {
  machines: Option[];
  initial: { machineId?: string; from?: string; to?: string };
}) {
  const { pending, navigate } = useFilterNavigation("/reports/machine");
  const [machineId, setMachineId] = useState(initial.machineId ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  const machineOptions = useMemo(
    () => machines.map((m) => ({ value: m.id, label: m.name, keywords: m.name })),
    [machines],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FilterCombobox
        label="المكينة"
        value={machineId}
        onValueChange={setMachineId}
        options={machineOptions}
        placeholder="اختر مكينة"
        searchPlaceholder="ابحث عن مكينة..."
      />
      <DateField
        label="من تاريخ"
        name="from"
        value={from}
        onChange={setFrom}
      />
      <DateField label="إلى تاريخ" name="to" value={to} onChange={setTo} />
      <div className="flex items-end">
        <LoadingButton
          type="button"
          onClick={() => {
            if (!machineId) return;
            navigate({ machineId, from, to });
          }}
          loading={pending}
          loadingText={ui.loading}
          disabled={!machineId}
          className="h-9 w-full"
        >
          عرض التقرير
        </LoadingButton>
      </div>
    </div>
  );
}
