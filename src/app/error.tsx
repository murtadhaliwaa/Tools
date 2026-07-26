"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/utils";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <BrandMark size={48} />
      <div className="space-y-2">
        <h1 className="text-xl font-bold">حدث خطأ غير متوقع</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          تعذّر إكمال الطلب. يمكنك المحاولة مرة أخرى أو العودة للوحة التحكم.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          إعادة المحاولة
        </Button>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          لوحة التحكم
        </Link>
      </div>
    </main>
  );
}
