"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

export function DateField({
  name,
  label,
  defaultValue,
  value,
  onChange,
  required,
  className,
}: {
  name?: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  const id = name ?? label;

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={ui.filterLabel}>
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type="date"
        {...(onChange
          ? { value: value ?? "", onChange: (e) => onChange(e.target.value) }
          : { defaultValue })}
        required={required}
        lang="ar-SA"
        dir="ltr"
        className={cn(ui.field, "dark:bg-input/30 dark:text-foreground")}
      />
    </div>
  );
}
