import { requireAdminPage } from "@/lib/auth";
import {
  getMonthlySummaryCached,
  getTopIssuedItemsCached,
} from "@/lib/cache";
import { TransactionTypeLabel } from "@/types/domain";
import { MonthlyReportExport } from "@/components/reports/report-export-buttons";
import { MonthlyCharts } from "@/components/reports/monthly-charts";
import { MonthlyReportFilters } from "@/components/reports/monthly-report-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { param, type SearchParams } from "@/lib/search-params";

function parseYearMonth(
  yearRaw: string | undefined,
  monthRaw: string | undefined,
) {
  const now = new Date();
  const year = Number(yearRaw ?? now.getFullYear());
  const month = Number(monthRaw ?? now.getMonth() + 1);
  const safeYear =
    Number.isFinite(year) && year >= 2000 && year <= 2100
      ? year
      : now.getFullYear();
  const safeMonth =
    Number.isFinite(month) && month >= 1 && month <= 12
      ? month
      : now.getMonth() + 1;
  return { year: safeYear, month: safeMonth };
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireAdminPage();

  const sp = await searchParams;
  const { year, month } = parseYearMonth(param(sp.year), param(sp.month));

  const [summary, topIssued] = await Promise.all([
    getMonthlySummaryCached(profile.organizationId, year, month),
    getTopIssuedItemsCached(profile.organizationId, 8),
  ]);

  const typeRows = Object.entries(summary.byType);
  const categoryRows = Object.entries(summary.byCategory);

  const typeChart = typeRows.map(([type, value]) => ({
    name:
      TransactionTypeLabel[type as keyof typeof TransactionTypeLabel] ?? type,
    value,
  }));

  const categoryChart = categoryRows.map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <PageShell>
      <PageHeader
        title="التقرير الشهري"
        description={`إجمالي الحركات: ${summary.total}`}
        actions={
          <MonthlyReportExport
            filename={`monthly-${year}-${month}`}
            title={`التقرير الشهري — ${month}/${year}`}
            sheetName="شهري"
            enabled={summary.total > 0}
            year={year}
            month={month}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اختر الشهر</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyReportFilters initialYear={year} initialMonth={month} />
        </CardContent>
      </Card>

      <MonthlyCharts
        typeChart={typeChart}
        categoryChart={categoryChart}
        topIssued={topIssued}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>حسب نوع الحركة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {typeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              typeRows.map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {TransactionTypeLabel[
                      type as keyof typeof TransactionTypeLabel
                    ] ?? type}
                  </span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حسب التصنيف</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              categoryRows.map(([name, count]) => (
                <div
                  key={name}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{name}</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
