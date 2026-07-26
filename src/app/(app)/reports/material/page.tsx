import { requireUser } from "@/lib/auth";
import { getItemFilterOptionsCached } from "@/lib/cache";
import { getMaterialReport } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { TransactionTypeLabel } from "@/types/domain";
import { MaterialReportExport } from "@/components/reports/report-export-buttons";
import { MaterialReportFilters } from "@/components/reports/material-report-filters";
import { StatusBadge, TransactionTypeBadge } from "@/components/shared/status-badge";
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

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

const TYPE_ORDER = [
  "ADDITION",
  "ISSUE",
  "RETURN_FROM_MACHINE",
  "SEND_TO_REPAIR",
  "RETURN_FROM_REPAIR",
] as const;

export default async function MaterialReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const itemId = param(sp.itemId);
  const from = param(sp.from);
  const to = param(sp.to);

  const items = await getItemFilterOptionsCached(profile.organizationId);

  const report = itemId
    ? await getMaterialReport({
        organizationId: profile.organizationId,
        itemId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(`${to}T23:59:59`) : undefined,
      })
    : null;

  const itemName = report?.item.name ?? "";

  return (
    <PageShell>
      <PageHeader
        title="تقرير مادة"
        description="حالة المادة وحركاتها خلال الفترة المحددة"
        actions={
          itemId ? (
            <MaterialReportExport
              filename={`material-report-${itemName || "item"}`}
              title={`تقرير مادة — ${itemName}`}
              sheetName="مادة"
              enabled={Boolean(report && report.rows.length > 0)}
              itemId={itemId}
              from={from}
              to={to}
            />
          ) : null
        }
      />

      {report?.truncated ? (
        <p className="text-sm text-muted-foreground">
          تم عرض أول {report.limit} حركة فقط. قلّص الفترة الزمنية لعرض الباقي.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اختيار المادة والفترة</CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialReportFilters
            items={items}
            initial={{ itemId, from, to }}
          />
        </CardContent>
      </Card>

      {report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  المادة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{report.item.name}</p>
                {report.item.code ? (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {report.item.code}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  التصنيف
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{report.item.categoryName}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  العدد
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium" dir="ltr">
                  {report.item.quantity}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  الحالة الحالية
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <StatusBadge status={report.item.status} />
                {report.item.machineName ? (
                  <p className="text-xs text-muted-foreground">
                    {report.item.machineName}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {TYPE_ORDER.map((type) => (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {TransactionTypeLabel[type]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold tabular-nums" dir="ltr">
                    {report.byType[type] ?? 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>النوع</TableHead>
                    <TableHead>المكينة</TableHead>
                    <TableHead>بواسطة</TableHead>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        لا توجد حركات في الفترة المحددة
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <TransactionTypeBadge type={r.type} />
                        </TableCell>
                        <TableCell>{r.machine?.name ?? "—"}</TableCell>
                        <TableCell>{r.performedBy.fullName}</TableCell>
                        <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                        <TableCell>{r.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              اختر مادة ثم اضغط عرض التقرير
            </p>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}
