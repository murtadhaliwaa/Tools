import { requireUser } from "@/lib/auth";
import { getCategoriesCached } from "@/lib/cache";
import { getInventoryReport, REPORT_PAGE_SIZE } from "@/services/reports";
import { ItemStatus, type ItemStatus as ItemStatusType } from "@/types/domain";
import { InventoryReportExport } from "@/components/reports/report-export-buttons";
import { InventoryReportFilters } from "@/components/reports/inventory-report-filters";
import {
  LowStockBadge,
  StatusBadge,
} from "@/components/shared/status-badge";
import { PagePagination } from "@/components/shared/page-pagination";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { param, parsePage, type SearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

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

function parseStock(value?: string): "low" | undefined {
  return value === "low" ? "low" : undefined;
}

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = param(sp.q);
  const categoryId = param(sp.categoryId);
  const status = parseStatus(param(sp.status));
  const stock = parseStock(param(sp.stock));

  const [report, categories] = await Promise.all([
    getInventoryReport({
      organizationId: profile.organizationId,
      page,
      pageSize: REPORT_PAGE_SIZE,
      search: q,
      categoryId,
      status,
      stock,
    }),
    getCategoriesCached(profile.organizationId),
  ]);

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    if (q) params.set("q", q);
    if (categoryId) params.set("categoryId", categoryId);
    if (status) params.set("status", status);
    if (stock) params.set("stock", stock);
    return `/reports/inventory?${params.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="جرد المخزون"
        description={`${report.total} مادة — إجمالي العدد في هذه الصفحة: ${report.totalQuantity}`}
        actions={
          <InventoryReportExport
            filename="inventory-report"
            title="جرد المخزون"
            sheetName="مخزون"
            enabled={report.total > 0}
            categoryId={categoryId}
            status={status}
            stock={stock}
            q={q}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">تصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryReportFilters
            categories={categories}
            initial={{ q, categoryId, status, stock }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المادة</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>العدد</TableHead>
                <TableHead>الحد الأدنى</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>المكينة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    لا توجد مواد مطابقة
                  </TableCell>
                </TableRow>
              ) : (
                report.rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      row.lowStock &&
                        "border-s-4 border-s-destructive bg-destructive/10",
                    )}
                  >
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{row.name}</div>
                      {row.code ? (
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {row.code}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{row.categoryName}</TableCell>
                    <TableCell
                      dir="ltr"
                      className={cn(
                        row.lowStock && "font-bold text-destructive",
                      )}
                    >
                      {row.quantity}
                    </TableCell>
                    <TableCell dir="ltr">
                      {row.minQuantity > 0 ? row.minQuantity : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        <StatusBadge status={row.status} />
                        <LowStockBadge
                          quantity={row.quantity}
                          minQuantity={row.minQuantity}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{row.machineName ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PagePagination
        page={report.page}
        totalPages={report.totalPages}
        hrefFor={hrefFor}
      />
    </PageShell>
  );
}
