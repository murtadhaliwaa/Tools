"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
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
    const params = new URLSearchParams();
    params.set("page", "1");
    if (q.trim()) params.set("q", q.trim());
    if (categoryId !== "all") params.set("categoryId", categoryId);
    if (status !== "all") params.set("status", status);
    startTransition(() => {
      router.push(`/items?${params.toString()}`);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <label className={ui.filterLabel}>بحث</label>
        <Input
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
