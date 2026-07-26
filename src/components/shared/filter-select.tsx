"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

export type FilterOption = {
  value: string;
  label: string;
};

/** قائمة تصفية موحّدة لكل المشروع */
export function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  placeholder,
  className,
  triggerClassName,
}: {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder ?? "اختر";

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? <Label className={ui.filterLabel}>{label}</Label> : null}
      <Select
        value={value || null}
        onValueChange={(v) => onValueChange(v ?? "")}
      >
        <SelectTrigger className={cn(ui.field, "w-full", triggerClassName)}>
          <SelectValue placeholder={placeholder ?? "اختر"}>
            {selectedLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
