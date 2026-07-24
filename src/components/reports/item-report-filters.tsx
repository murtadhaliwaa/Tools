"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string; code?: string | null };

export function ItemReportFilters({
  items,
  initialItemId,
}: {
  items: Option[];
  initialItemId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [itemId, setItemId] = useState(initialItemId ?? "");

  const options = useMemo(
    () =>
      items.map((i) => ({
        value: i.id,
        label: i.code ? `${i.name} (${i.code})` : i.name,
      })),
    [items],
  );

  function apply() {
    if (!itemId) return;
    startTransition(() => {
      router.push(`/reports/item?itemId=${encodeURIComponent(itemId)}`);
    });
  }

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
        onClick={apply}
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
