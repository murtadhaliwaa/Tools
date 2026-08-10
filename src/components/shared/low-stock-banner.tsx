"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * شريط تنبيه بارز أعلى كل الصفحات.
 * الإخفاء يدوم أثناء التصفح الحالي، ويعود عند تغيّر العدد (عبر key) أو إعادة التحميل.
 */
export function LowStockBanner({ count }: { count: number }) {
  const [dismissed, setDismissed] = useState(false);

  if (count <= 0 || dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-destructive bg-destructive px-4 py-3 text-destructive-foreground md:px-6"
    >
      <TriangleAlert className="size-5 shrink-0" />
      <p className="min-w-0 flex-1 text-sm font-semibold sm:text-base">
        تنبيه: {count} من المواد قاربت النفاد أو نفدت
      </p>
      <Link
        href="/items?stock=low"
        className="shrink-0 rounded-md bg-background px-3 py-1.5 text-sm font-semibold text-foreground hover:opacity-90"
      >
        عرض المواد
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="إخفاء التنبيه"
        className="size-8 shrink-0 text-destructive-foreground hover:bg-background/20 hover:text-destructive-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
