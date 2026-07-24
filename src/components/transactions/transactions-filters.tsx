"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { TransactionTypeLabel } from "@/types/domain";

type Option = { id: string; name: string };

export function TransactionsFilters({
  items,
  machines,
  initial,
}: {
  items: Option[];
  machines: Option[];
  initial: {
    type?: string;
    itemId?: string;
    machineId?: string;
    from?: string;
    to?: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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

  const itemOptions = useMemo(
    () => [
      { value: "all", label: "كل الأدوات" },
      ...items.map((i) => ({ value: i.id, label: i.name })),
    ],
    [items],
  );

  const machineOptions = useMemo(
    () => [
      { value: "all", label: "كل المكائن" },
      ...machines.map((m) => ({ value: m.id, label: m.name })),
    ],
    [machines],
  );

  function apply() {
    const q = new URLSearchParams();
    q.set("page", "1");
    if (type !== "all") q.set("type", type);
    if (itemId !== "all") q.set("itemId", itemId);
    if (machineId !== "all") q.set("machineId", machineId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    startTransition(() => {
      router.push(`/transactions?${q.toString()}`);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FilterSelect
        label="النوع"
        value={type}
        onValueChange={setType}
        options={typeOptions}
        placeholder="كل الأنواع"
      />
      <FilterSelect
        label="الأداة"
        value={itemId}
        onValueChange={setItemId}
        options={itemOptions}
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
          onClick={apply}
          loading={pending}
          loadingText="جاري التطبيق..."
          className="h-9 w-full"
        >
          تطبيق التصفية
        </LoadingButton>
      </div>
    </div>
  );
}
