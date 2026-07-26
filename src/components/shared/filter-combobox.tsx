"use client";

import { Label } from "@/components/ui/label";
import {
  SearchCombobox,
  type ComboboxOption,
} from "@/components/shared/search-combobox";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

/** قائمة بحث موحّدة للفلاتر الطويلة (أدوات / مكائن / مواد) */
export function FilterCombobox({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "ابحث...",
  emptyText = "لا توجد نتائج",
  className,
}: {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label className={ui.filterLabel}>{label}</Label> : null}
      <SearchCombobox
        options={options}
        value={value}
        onChange={onValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
      />
    </div>
  );
}
