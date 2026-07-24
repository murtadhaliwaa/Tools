"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string };

export function MachineReportFilters({
  machines,
  initial,
}: {
  machines: Option[];
  initial: { machineId?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [machineId, setMachineId] = useState(initial.machineId ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  const machineOptions = useMemo(
    () => machines.map((m) => ({ value: m.id, label: m.name })),
    [machines],
  );

  function apply() {
    if (!machineId) return;
    const q = new URLSearchParams();
    q.set("machineId", machineId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    startTransition(() => {
      router.push(`/reports/machine?${q.toString()}`);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FilterSelect
        label="المكينة"
        value={machineId}
        onValueChange={setMachineId}
        options={machineOptions}
        placeholder="اختر مكينة"
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
          onClick={apply}
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
