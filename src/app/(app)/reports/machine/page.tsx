import { requireUser } from "@/lib/auth";
import { getMachinesCached } from "@/lib/cache";
import { getMachineReport, REPORT_PAGE_SIZE } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { MachineReportExport } from "@/components/reports/report-export-buttons";
import { MachineReportFilters } from "@/components/reports/machine-report-filters";
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
  parsePage,
  type SearchParams,
} from "@/lib/search-params";

export default async function MachineReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const machineId = param(sp.machineId);
  const from = param(sp.from);
  const to = param(sp.to);
  const page = parsePage(sp.page);

  const machines = await getMachinesCached(profile.organizationId);

  const report = machineId
    ? await getMachineReport({
        organizationId: profile.organizationId,
        machineId,
        from: from ? new Date(from) : undefined,
        to: parseDayEnd(to),
        page,
        pageSize: REPORT_PAGE_SIZE,
      })
    : null;
  const rows = report?.rows ?? [];

  const machineName = machines.find((m) => m.id === machineId)?.name ?? "";

  function hrefFor(nextPage: number) {
    const q = new URLSearchParams();
    q.set("page", String(nextPage));
    if (machineId) q.set("machineId", machineId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    return `/reports/machine?${q.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="تقرير مكينة"
        description={
          report
            ? `${report.total} حركة صرف`
            : "الأدوات المصروفة للمكينة المحددة"
        }
        actions={
          machineId ? (
            <MachineReportExport
              filename={`machine-report-${machineName || "machine"}`}
              title={`تقرير مكينة — ${machineName}`}
              sheetName="مكينة"
              enabled={(report?.total ?? 0) > 0}
              machineId={machineId}
              from={from}
              to={to}
            />
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اختيار الفترة والمكينة</CardTitle>
        </CardHeader>
        <CardContent>
          <MachineReportFilters
            machines={machines}
            initial={{ machineId, from, to }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الأداة</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>بواسطة</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    {machineId
                      ? "لا توجد بيانات"
                      : "اختر مكينة ثم اضغط عرض التقرير"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.item.name}</TableCell>
                    <TableCell>{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.performedBy.fullName}</TableCell>
                    <TableCell>{r.notes ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {report ? (
        <PagePagination
          page={report.page}
          totalPages={report.totalPages}
          hrefFor={hrefFor}
        />
      ) : null}
    </PageShell>
  );
}
