import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMonthlySummary, getTopIssuedItems } from "@/services/reports";
import { TransactionTypeLabel } from "@/types/domain";
import { ExportCsvButton } from "@/components/reports/export-csv-button";
import { MonthlyCharts } from "@/components/reports/monthly-charts";
import { MonthlyReportFilters } from "@/components/reports/monthly-report-filters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  if (profile.role !== "ADMIN") redirect("/dashboard");

  const sp = await searchParams;
  const now = new Date();
  const year = Number(param(sp.year) ?? now.getFullYear());
  const month = Number(param(sp.month) ?? now.getMonth() + 1);

  const [summary, topIssued] = await Promise.all([
    getMonthlySummary({
      organizationId: profile.organizationId,
      year,
      month,
    }),
    getTopIssuedItems(profile.organizationId, 8),
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">التقرير الشهري</h1>
          <p className="text-sm text-muted-foreground">
            إجمالي الحركات: {summary.total}
          </p>
        </div>
        <ExportCsvButton
          filename={`monthly-${year}-${month}`}
          sheetName="شهري"
          headers={["القسم", "الاسم", "العدد"]}
          rows={[
            ...typeRows.map(([type, count]) => [
              "النوع",
              TransactionTypeLabel[type as keyof typeof TransactionTypeLabel] ??
                type,
              count,
            ]),
            ...categoryRows.map(([name, count]) => ["التصنيف", name, count]),
          ]}
        />
      </div>

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
    </div>
  );
}
