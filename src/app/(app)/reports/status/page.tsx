import { requireUser } from "@/lib/auth";
import { getRepairStatusReport } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { ExportCsvButton } from "@/components/reports/export-csv-button";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function StatusReportPage() {
  const { profile } = await requireUser();
  const rows = await getRepairStatusReport(profile.organizationId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">تقرير حالة التصليح</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} أداة تحت التصليح حالياً
          </p>
        </div>
        <ExportCsvButton
          filename="repair-status"
          headers={["الأداة", "الرمز", "التصنيف", "منذ"]}
          rows={rows.map((r) => [
            r.name,
            r.code,
            r.categoryName,
            r.since ? formatDateTime(r.since) : "",
          ])}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الأداة</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>منذ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    لا توجد أدوات تحت التصليح
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.categoryName}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      {r.since ? formatDateTime(r.since) : "—"}
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
