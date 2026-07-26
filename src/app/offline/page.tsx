"use client";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6 text-center">
      <div className="space-y-4">
        <div className="flex justify-center">
          <BrandMark size={56} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold">أنت غير متصل</h1>
          <p className="text-sm text-muted-foreground">
            تحقق من اتصال الإنترنت ثم أعد المحاولة.
          </p>
        </div>
        <Button type="button" onClick={() => window.location.reload()}>
          إعادة المحاولة
        </Button>
      </div>
    </main>
  );
}
