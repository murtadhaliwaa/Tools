import Link from "next/link";
import { BrandMark } from "@/components/shared/brand-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <BrandMark size={48} />
      <div className="space-y-2">
        <h1 className="text-xl font-bold">الصفحة غير موجودة</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          الرابط غير صحيح أو الصفحة نُقلت. عد إلى لوحة التحكم للمتابعة.
        </p>
      </div>
      <Link href="/dashboard" className={cn(buttonVariants())}>
        لوحة التحكم
      </Link>
    </main>
  );
}
