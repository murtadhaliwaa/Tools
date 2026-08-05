"use client";

import { useState } from "react";
import { DateField } from "@/components/shared/date-field";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  ServerItemCombobox,
  type ItemFilterOption,
} from "@/components/shared/server-item-combobox";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

export function MaterialReportFilters({
  initial,
  initialItem = null,
}: {
  initial: { itemId?: string; from?: string; to?: string };
  initialItem?: ItemFilterOption | null;
}) {
  const { pending, navigate } = useFilterNavigation("/reports/material");
  const [itemId, setItemId] = useState(initial.itemId ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ServerItemCombobox
        label="المادة"
        value={itemId}
        onValueChange={setItemId}
        initialSelected={initialItem}
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
