"use client";

import { useMemo, useState } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  ServerItemCombobox,
  type ItemFilterOption,
} from "@/components/shared/server-item-combobox";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { TransactionTypeLabel } from "@/types/domain";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string };

export function TransactionsFilters({
  machines,
  initial,
  initialItem = null,
}: {
  machines: Option[];
  initial: {
    type?: string;
    itemId?: string;
    machineId?: string;
    from?: string;
    to?: string;
  };
  initialItem?: ItemFilterOption | null;
}) {
  const { pending, navigate } = useFilterNavigation("/transactions");
  const [type, setType] = useState(initial.type || "all");
  const [itemId, setItemId] = useState(initial.itemId || "all");
  const [machineId, setMachineId] = useState(initial.machineId || "all");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  const typeOptions = useMemo(
    () => [
      { value: "all", label: "كل الأنواع" },
      ...Object.entries(TransactionTypeLabel).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    [],
  );

  const machineOptions = useMemo(
    () => [
      { value: "all", label: "كل المكائن" },
      ...machines.map((m) => ({ value: m.id, label: m.name })),
    ],
    [machines],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FilterSelect
        label="النوع"
        value={type}
        onValueChange={setType}
        options={typeOptions}
        placeholder="كل الأنواع"
      />
      <ServerItemCombobox
        label="الأداة"
        value={itemId}
        onValueChange={setItemId}
        initialSelected={initialItem}
        allowAll
        placeholder="كل الأدوات"
      />
      <FilterSelect
        label="المكينة"
        value={machineId}
        onValueChange={setMachineId}
        options={machineOptions}
        placeholder="كل المكائن"
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
          onClick={() =>
            navigate({
              page: "1",
              type: type !== "all" ? type : undefined,
              itemId: itemId !== "all" ? itemId : undefined,
              machineId: machineId !== "all" ? machineId : undefined,
              from: from || undefined,
              to: to || undefined,
            })
          }
          loading={pending}
          loadingText={ui.loading}
          className="h-9 w-full"
        >
          تطبيق
        </LoadingButton>
      </div>
    </div>
  );
}
