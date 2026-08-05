"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { searchItemFilterOptionsAction } from "@/actions/catalog";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import type { ComboboxOption } from "@/components/shared/search-combobox";

export type ItemFilterOption = {
  id: string;
  name: string;
  code?: string | null;
};

function toOption(item: ItemFilterOption): ComboboxOption {
  return {
    value: item.id,
    label: item.code ? `${item.name} (${item.code})` : item.name,
    keywords: [item.name, item.code].filter(Boolean).join(" "),
  };
}

/**
 * فلتر أدوات ببحث من الخادم — لا يحمّل مئات الخيارات في RSC.
 */
export function ServerItemCombobox({
  label = "الأداة",
  value,
  onValueChange,
  initialSelected = null,
  allowAll = false,
  allLabel = "كل الأدوات",
  placeholder = "اختر أداة",
  searchPlaceholder = "ابحث بالاسم أو الرمز...",
  className,
}: {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  initialSelected?: ItemFilterOption | null;
  allowAll?: boolean;
  allLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const allOption = useMemo(
    () => (allowAll ? [{ value: "all", label: allLabel }] : []),
    [allowAll, allLabel],
  );

  const [options, setOptions] = useState<ComboboxOption[]>(() => {
    const selected = initialSelected ? [toOption(initialSelected)] : [];
    return [...allOption, ...selected];
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedRef = useRef(initialSelected);
  const valueRef = useRef(value);

  useEffect(() => {
    selectedRef.current = initialSelected;
  }, [initialSelected]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    void loadSuggestions("");
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // تحميل أولي عند التركيب فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSuggestions(query: string) {
    const rows = await searchItemFilterOptionsAction(query);
    const mapped = rows.map(toOption);
    const current = valueRef.current;
    const keep: ComboboxOption[] = [];
    if (
      current &&
      current !== "all" &&
      !mapped.some((o) => o.value === current) &&
      selectedRef.current?.id === current
    ) {
      keep.push(toOption(selectedRef.current));
    }
    const keepIds = new Set(keep.map((o) => o.value));
    setOptions([
      ...allOption,
      ...keep,
      ...mapped.filter((o) => !keepIds.has(o.value)),
    ]);
  }

  function onSearchChange(query: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void loadSuggestions(query);
    }, 250);
  }

  return (
    <FilterCombobox
      label={label}
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
      onSearchChange={onSearchChange}
      serverFilter
    />
  );
}
