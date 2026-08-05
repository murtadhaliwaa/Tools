import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

type PagePaginationProps = {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
  /** إجمالي السجلات اختياري للوصف */
  total?: number;
};

/** ترقيم صفحات موحّد للقوائم والتقارير */
export function PagePagination({
  page,
  totalPages,
  hrefFor,
}: PagePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3">
      {page <= 1 ? (
        <Button variant="outline" size="sm" disabled>
          السابق
        </Button>
      ) : (
        <Link
          href={hrefFor(page - 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          السابق
        </Link>
      )}
      <span className={ui.subtitle}>
        صفحة {page} من {totalPages}
      </span>
      {page >= totalPages ? (
        <Button variant="outline" size="sm" disabled>
          التالي
        </Button>
      ) : (
        <Link
          href={hrefFor(page + 1)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          التالي
        </Link>
      )}
    </div>
  );
}
