"use client";

import { useState } from "react";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  ServerItemCombobox,
  type ItemFilterOption,
} from "@/components/shared/server-item-combobox";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

export function ItemReportFilters({
  initialItemId,
  initialItem = null,
}: {
  initialItemId?: string;
  initialItem?: ItemFilterOption | null;
}) {
  const { pending, navigate } = useFilterNavigation("/reports/item");
  const [itemId, setItemId] = useState(initialItemId ?? "");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <ServerItemCombobox
        label="الأداة"
        value={itemId}
        onValueChange={setItemId}
        initialSelected={initialItem}
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
