"use client";

import { useMemo, useState } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  ServerItemCombobox,
  type ItemFilterOption,
} from "@/components/shared/server-item-combobox";
import { Button } from "@/components/ui/button";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { defaultWeekRange } from "@/lib/date-range";
import { ui } from "@/lib/ui";

type MachineOption = { id: string; name: string };

export function IssuesReportFilters({
  machines,
  initial,
  initialItem = null,
}: {
  machines: MachineOption[];
  initial: {
    from?: string;
    to?: string;
    machineId?: string;
    itemId?: string;
  };
  initialItem?: ItemFilterOption | null;
}) {
  const { pending, navigate } = useFilterNavigation("/reports/issues");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [machineId, setMachineId] = useState(initial.machineId || "all");
  const [itemId, setItemId] = useState(initial.itemId || "");

  const machineOptions = useMemo(
    () => [
      { value: "all", label: "كل المكائن" },
      ...machines.map((m) => ({ value: m.id, label: m.name })),
    ],
    [machines],
  );

  function apply(extra?: { from?: string; to?: string }) {
    const nextFrom = extra?.from ?? from;
    const nextTo = extra?.to ?? to;
    if (!nextFrom || !nextTo) return;
    navigate({
      page: "1",
      from: nextFrom,
      to: nextTo,
      machineId: machineId !== "all" ? machineId : undefined,
      itemId: itemId || undefined,
    });
  }

  function applyThisWeek() {
    const range = defaultWeekRange();
    setFrom(range.from);
    setTo(range.to);
    apply(range);
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <DateField
          label="من تاريخ"
          name="from"
          value={from}
          onChange={setFrom}
        />
        <DateField label="إلى تاريخ" name="to" value={to} onChange={setTo} />
        <FilterSelect
          label="المكينة"
          value={machineId}
          onValueChange={setMachineId}
          options={machineOptions}
        />
        <div className="space-y-1.5">
          <span className={ui.filterLabel}>المادة (اختياري)</span>
          <ServerItemCombobox
            value={itemId}
            onValueChange={setItemId}
            initialSelected={initialItem}
            placeholder="كل المواد"
            searchPlaceholder="ابحث عن مادة..."
          />
        </div>
        <div className="flex items-end gap-2">
          <LoadingButton
            type="button"
            onClick={() => apply()}
            loading={pending}
            loadingText={ui.loading}
            disabled={!from || !to}
            className="h-9 flex-1"
          >
            عرض التقرير
          </LoadingButton>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={applyThisWeek}
      >
        هذا الأسبوع (من الاثنين)
      </Button>
    </div>
  );
}
