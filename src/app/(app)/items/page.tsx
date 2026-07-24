import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCategoriesCached } from "@/lib/cache";
import { listItemsWithStatus } from "@/services/items";
import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";
import { ItemsFilters } from "@/components/catalog/items-filters";
import { ItemsManager } from "@/components/catalog/items-manager";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function parseStatus(value?: string): ItemStatusType | undefined {
  if (!value) return undefined;
  if (
    value === ItemStatus.AVAILABLE ||
    value === ItemStatus.ISSUED ||
    value === ItemStatus.IN_REPAIR
  ) {
    return value;
  }
  return undefined;
}

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const page = Number(param(sp.page) ?? "1") || 1;
  const q = param(sp.q);
  const categoryId = param(sp.categoryId);
  const status = parseStatus(param(sp.status));

  const [result, categories] = await Promise.all([
    listItemsWithStatus({
      organizationId: profile.organizationId,
      page,
      pageSize: 40,
      search: q,
      categoryId,
      status,
    }),
    getCategoriesCached(profile.organizationId),
  ]);

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (status) params.set("status", status);
    return `/items?${params.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="الأدوات"
        description={`${result.total} أداة`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemsFilters
            categories={categories}
            initial={{ q, categoryId, status }}
          />
        </CardContent>
      </Card>

      <ItemsManager items={result.rows} categories={categories} />

      <div className="flex items-center justify-between">
        {page <= 1 ? (
          <Button variant="outline" disabled>
            السابق
          </Button>
        ) : (
          <Link
            href={hrefFor(page - 1)}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            السابق
          </Link>
        )}
        <span className={ui.subtitle}>
          صفحة {result.page} من {result.totalPages}
        </span>
        {page >= result.totalPages ? (
          <Button variant="outline" disabled>
            التالي
          </Button>
        ) : (
          <Link
            href={hrefFor(page + 1)}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            التالي
          </Link>
        )}
      </div>
    </PageShell>
  );
}
