"use client";

import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFilterNavigation } from "@/hooks/use-filter-navigation";
import { ItemStatus, ItemStatusLabel } from "@/types/domain";
import { ui } from "@/lib/ui";

type CategoryOption = { id: string; name: string };

/** فلاتر أدوات على السيرفر عبر URL — بدون فلترة كل الجدول في الذاكرة */
export function ItemsFilters({
  categories,
  initial,
}: {
  categories: CategoryOption[];
  initial: {
    q?: string;
    categoryId?: string;
    status?: string;
  };
}) {
  const { pending, navigate } = useFilterNavigation("/items");
  const [q, setQ] = useState(initial.q ?? "");
  const [categoryId, setCategoryId] = useState(initial.categoryId || "all");
  const [status, setStatus] = useState(initial.status || "all");

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "كل التصنيفات" },
      ...categories.map((c) => ({ value: c.id, label: c.name })),
    ],
    [categories],
  );

  const statusOptions = useMemo(
    () => [
      { value: "all", label: "كل الحالات" },
      ...Object.values(ItemStatus).map((s) => ({
        value: s,
        label: ItemStatusLabel[s],
      })),
    ],
    [],
  );

  function apply() {
    navigate({
      page: "1",
      q: q.trim() || undefined,
      categoryId: categoryId !== "all" ? categoryId : undefined,
      status: status !== "all" ? status : undefined,
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="items-search" className={ui.filterLabel}>
          بحث
        </Label>
        <Input
          id="items-search"
          placeholder="بالاسم أو الرمز..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={ui.field}
          onKeyDown={(e) => {
            if (e.key === "Enter") apply();
          }}
        />
      </div>
      <FilterSelect
        label="التصنيف"
        value={categoryId}
        onValueChange={setCategoryId}
        options={categoryOptions}
      />
      <FilterSelect
        label="الحالة"
        value={status}
        onValueChange={setStatus}
        options={statusOptions}
      />
      <div className="flex items-end">
        <LoadingButton
          type="button"
          onClick={apply}
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
