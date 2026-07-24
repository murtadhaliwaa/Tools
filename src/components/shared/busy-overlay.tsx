"use client";

import type { ReactNode } from "react";
import { Spinner } from "@/components/shared/spinner";
import { cn } from "@/lib/utils";

/** غلاف جدول/قائمة يعرض طبقة تحميل أثناء الحفظ */
export function BusyOverlay({
  busy,
  children,
  className,
  label = "جاري الحفظ...",
}: {
  busy: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("relative", className)} aria-busy={busy || undefined}>
      {children}
      {busy ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-background/60 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
            <Spinner className="size-4" />
            <span>{label}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
