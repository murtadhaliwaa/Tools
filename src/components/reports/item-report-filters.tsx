"use client";

import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string; code?: string | null };

export function ItemReportFilters({
  items,
  initialItemId,
}: {
  items: Option[];
  initialItemId?: string;
}) {
  const { pending, navigate } = useFilterNavigation("/reports/item");
  const [itemId, setItemId] = useState(initialItemId ?? "");

  const options = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: i.code ? `${i.name} (${i.code})` : i.name,
      })),
    [items],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <FilterSelect
        label="الأداة"
        value={itemId}
        onValueChange={setItemId}
        options={options}
        placeholder="اختر أداة"
        className="min-w-56 flex-1"
      />
      <LoadingButton
        type="button"
        onClick={() => {
          if (!itemId) return;
          navigate({ itemId });
        }}
        loading={pending}
        loadingText={ui.loading}
        disabled={!itemId}
        className="h-9"
      >
        عرض
      </LoadingButton>
    </div>
  );
}
