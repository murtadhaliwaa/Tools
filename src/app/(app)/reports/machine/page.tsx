import { requireUser } from "@/lib/auth";
import { getMachinesCached } from "@/lib/cache";
import { getMachineReport } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { ExportCsvButton } from "@/components/reports/export-csv-button";
import { MachineReportFilters } from "@/components/reports/machine-report-filters";
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

  const machines = await getMachinesCached(profile.organizationId);

  const rows = machineId
    ? await getMachineReport({
        organizationId: profile.organizationId,
        machineId,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(`${to}T23:59:59`) : undefined,
      })
    : [];

  const machineName = machines.find((m) => m.id === machineId)?.name ?? "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">تقرير مكينة</h1>
          <p className="text-sm text-muted-foreground">
            الأدوات المصروفة للمكينة المحددة
          </p>
        </div>
        {rows.length > 0 ? (
          <ExportCsvButton
            filename={`machine-report-${machineName}`}
            headers={["الأداة", "الرمز", "التاريخ", "بواسطة", "ملاحظات"]}
            rows={rows.map((r) => [
              r.item.name,
              r.item.code,
              formatDateTime(r.createdAt),
              r.performedBy.fullName,
              r.notes,
            ])}
          />
        ) : null}
      </div>

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
                <TableHead className="text-center">الأداة</TableHead>
                <TableHead className="text-center">التاريخ</TableHead>
                <TableHead className="text-center">بواسطة</TableHead>
                <TableHead className="text-center">ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground"
                  >
                    {machineId
                      ? "لا توجد بيانات"
                      : "اختر مكينة ثم اضغط عرض التقرير"}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-center">{r.item.name}</TableCell>
                    <TableCell className="text-center">
                      {formatDateTime(r.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.performedBy.fullName}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.notes ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
