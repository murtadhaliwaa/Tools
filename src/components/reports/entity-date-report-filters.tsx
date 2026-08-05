"use client";

import { useMemo, useState } from "react";
import { DateField } from "@/components/shared/date-field";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { LoadingButton } from "@/components/shared/loading-button";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

type Option = { id: string; name: string; code?: string | null };

/** فلاتر تقرير: كيان (أداة/مكينة/مادة) + من/إلى تاريخ */
export function EntityDateReportFilters({
  basePath,
  entityKey,
  entityLabel,
  options,
  initial,
  searchPlaceholder = "ابحث...",
  submitLabel = "عرض التقرير",
}: {
  basePath: string;
  entityKey: "itemId" | "machineId";
  entityLabel: string;
  options: Option[];
  initial: { entityId?: string; from?: string; to?: string };
  searchPlaceholder?: string;
  submitLabel?: string;
}) {
  const { pending, navigate } = useFilterNavigation(basePath);
  const [entityId, setEntityId] = useState(initial.entityId ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  const comboboxOptions = useMemo(
    () =>
      options.map((o) => ({
        value: o.id,
        label: o.code ? `${o.name} (${o.code})` : o.name,
        keywords: [o.name, o.code].filter(Boolean).join(" "),
      })),
    [options],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <FilterCombobox
        label={entityLabel}
        value={entityId}
        onValueChange={setEntityId}
        options={comboboxOptions}
        placeholder={`اختر ${entityLabel}`}
        searchPlaceholder={searchPlaceholder}
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
            if (!entityId) return;
            navigate({ [entityKey]: entityId, from, to });
          }}
          loading={pending}
          loadingText={ui.loading}
          disabled={!entityId}
          className="h-9 w-full"
        >
          {submitLabel}
        </LoadingButton>
      </div>
    </div>
  );
}
