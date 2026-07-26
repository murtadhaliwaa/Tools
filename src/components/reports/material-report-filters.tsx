"use client";

import { useMemo, useState } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string; code?: string | null };

export function MaterialReportFilters({
  items,
  initial,
}: {
  items: Option[];
  initial: { itemId?: string; from?: string; to?: string };
}) {
  const { pending, navigate } = useFilterNavigation("/reports/material");
  const [itemId, setItemId] = useState(initial.itemId ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  const options = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: i.code ? `${i.name} (${i.code})` : i.name,
      })),
    [items],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FilterSelect
        label="المادة"
        value={itemId}
        onValueChange={setItemId}
        options={options}
        placeholder="اختر مادة"
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
            if (!itemId) return;
            navigate({ itemId, from, to });
          }}
          loading={pending}
          loadingText={ui.loading}
          disabled={!itemId}
          className="h-9 w-full"
        >
          عرض التقرير
        </LoadingButton>
      </div>
    </div>
  );
}
