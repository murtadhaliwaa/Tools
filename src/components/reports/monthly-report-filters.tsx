"use client";

import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ui } from "@/lib/ui";

const MONTH_LABELS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function MonthlyReportFilters({
  initialYear,
  initialMonth,
}: {
  initialYear: number;
  initialMonth: number;
}) {
  const { pending, navigate } = useFilterNavigation("/reports/monthly");
  const [year, setYear] = useState(String(initialYear));
  const [month, setMonth] = useState(String(initialMonth));

  const monthOptions = useMemo(
    () =>
      MONTH_LABELS.map((label, index) => ({
        value: String(index + 1),
        label,
      })),
    [],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          السنة
        </Label>
        <Input
          type="number"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="h-9 w-28"
          min={2020}
          max={2100}
        />
      </div>
      <FilterSelect
        label="الشهر"
        value={month}
        onValueChange={setMonth}
        options={monthOptions}
        placeholder="اختر الشهر"
        className="min-w-40"
      />
      <LoadingButton
        type="button"
        onClick={() => navigate({ year, month })}
        loading={pending}
        loadingText={ui.loading}
        className="h-9"
      >
        عرض
      </LoadingButton>
    </div>
  );
}
