import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTransactions } from "@/services/transaction-queries";
import { getItemFilterOptionById } from "@/services/catalog";
import { getMachinesCached } from "@/lib/cache";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { param, parseDayEnd, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";


export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const page = Number(param(sp.page) ?? "1") || 1;
  const type = param(sp.type);
  const itemId = param(sp.itemId);
  const machineId = param(sp.machineId);
  const from = param(sp.from);
  const to = param(sp.to);

  const [result, machines, initialItem] = await Promise.all([
    listTransactions({
      organizationId: profile.organizationId,
      page,
      pageSize: 20,
      type,
      itemId,
      machineId,
      from: from ? new Date(from) : undefined,
      to: parseDayEnd(to),
    }),
    getMachinesCached(profile.organizationId),
    itemId
      ? getItemFilterOptionById(profile.organizationId, itemId)
      : Promise.resolve(null),
  ]);


  function hrefFor(nextPage: number) {
    const q = new URLSearchParams();
    q.set("page", String(nextPage));
    if (type) q.set("type", type);
    if (itemId) q.set("itemId", itemId);
    if (machineId) q.set("machineId", machineId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return `/transactions?${q.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="سجل الحركات"
        description={`${result.total} حركة`}
        actions={
          <Link href="/transactions/new" className={cn(buttonVariants())}>
            تسجيل حركة
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsFilters
            machines={machines}
            initialItem={initialItem}
            initial={{ type, itemId, machineId, from, to }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <TransactionsTable
            rows={result.rows}
            canManage={profile.role === "ADMIN"}
            currentUserId={profile.id}
          />
        </CardContent>
      </Card>

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
