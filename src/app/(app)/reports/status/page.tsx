import { requireUser } from "@/lib/auth";
import { getRepairStatusReport } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { RepairStatusExport } from "@/components/reports/report-export-buttons";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-header";
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
    <PageShell>
      <PageHeader
        title="تقرير حالة التصليح"
        description={`${rows.length} أداة تحت التصليح حالياً`}
        actions={
          <RepairStatusExport
            filename="repair-status"
            title="تقرير حالة التصليح"
            sheetName="تصليح"
            enabled={rows.length > 0}
          />
        }
      />

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
                  <TableCell colSpan={4} className="text-muted-foreground">
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
    </PageShell>
  );
}
