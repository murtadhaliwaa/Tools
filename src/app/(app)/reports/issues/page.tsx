import { requireUser } from "@/lib/auth";
import { getItemFilterOptionById } from "@/services/catalog";
import { getMachinesCached } from "@/lib/cache";
import { getIssuesReport, REPORT_PAGE_SIZE } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { defaultWeekRange } from "@/lib/date-range";
import { IssuesReportExport } from "@/components/reports/report-export-buttons";
import { IssuesReportFilters } from "@/components/reports/issues-report-filters";
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
import {
  param,
  parseDayEnd,
  parseDayStart,
  parsePage,
  type SearchParams,
} from "@/lib/search-params";

export default async function IssuesReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const page = parsePage(sp.page);

  const urlFrom = param(sp.from);
  const urlTo = param(sp.to);
  const defaults = defaultWeekRange();
  const from = urlFrom ?? defaults.from;
  const to = urlTo ?? defaults.to;
  const machineId = param(sp.machineId);
  const itemId = param(sp.itemId);

  const [report, machines, initialItem] = await Promise.all([
    getIssuesReport({
      organizationId: profile.organizationId,
      from: parseDayStart(from),
      to: parseDayEnd(to),
      machineId,
      itemId,
      page,
      pageSize: REPORT_PAGE_SIZE,
    }),
    getMachinesCached(profile.organizationId),
    itemId
      ? getItemFilterOptionById(profile.organizationId, itemId)
      : Promise.resolve(null),
  ]);

  function hrefFor(nextPage: number) {
    const q = new URLSearchParams();
    q.set("page", String(nextPage));
    q.set("from", from);
    q.set("to", to);
    if (machineId) q.set("machineId", machineId);
    if (itemId) q.set("itemId", itemId);
    return `/reports/issues?${q.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="تقرير الصرف"
        description={`${report.total} عملية صرف — من ${from} إلى ${to}`}
        actions={
          <IssuesReportExport
            filename={`issues-report-${from}-${to}`}
            title={`تقرير الصرف — ${from} → ${to}`}
            sheetName="صرف"
            enabled={report.total > 0}
            from={from}
            to={to}
            machineId={machineId}
            itemId={itemId}
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الفترة والفلاتر</CardTitle>
        </CardHeader>
        <CardContent>
          <IssuesReportFilters
            machines={machines}
            initial={{ from, to, machineId, itemId }}
            initialItem={initialItem}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الأداة</TableHead>
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
                    لا توجد عمليات صرف في هذه الفترة
                  </TableCell>
                </TableRow>
              ) : (
                report.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-normal">
                      <div className="font-medium">{r.item.name}</div>
                      {r.item.code ? (
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {r.item.code}
                        </div>
                      ) : null}
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

      <PagePagination
        page={report.page}
        totalPages={report.totalPages}
        hrefFor={hrefFor}
      />
    </PageShell>
  );
}
