import { requireUser } from "@/lib/auth";
import { getRepairStatusReport } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { RepairStatusExport } from "@/components/reports/report-export-buttons";
import { StatusBadge } from "@/components/shared/status-badge";
import { PagePagination } from "@/components/shared/page-pagination";
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
import { parsePage, type SearchParams } from "@/lib/search-params";

export default async function StatusReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const { rows, total, pageSize, page: currentPage } = await getRepairStatusReport(
    profile.organizationId,
    { page, pageSize: 50 },
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell>
      <PageHeader
        title="تقرير حالة التصليح"
        description={`${total} أداة تحت التصليح حالياً`}
        actions={
          <RepairStatusExport
            filename="repair-status"
            title="تقرير حالة التصليح"
            sheetName="تصليح"
            enabled={total > 0}
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

      <PagePagination
        page={currentPage}
        totalPages={totalPages}
        hrefFor={(p) => `/reports/status?page=${p}`}
      />
    </PageShell>
  );
}
