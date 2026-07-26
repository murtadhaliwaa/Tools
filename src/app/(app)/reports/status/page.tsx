import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getRepairStatusReport } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { RepairStatusExport } from "@/components/reports/report-export-buttons";
import { StatusBadge } from "@/components/shared/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export default async function StatusReportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(param(sp.page) ?? "1") || 1);
  const { rows, total, pageSize } = await getRepairStatusReport(
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

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            صفحة {page} من {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={page > 1 ? `/reports/status?page=${page - 1}` : "#"}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                page <= 1 && "pointer-events-none opacity-50",
              )}
              aria-disabled={page <= 1}
            >
              السابق
            </Link>
            <Link
              href={
                page < totalPages ? `/reports/status?page=${page + 1}` : "#"
              }
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                page >= totalPages && "pointer-events-none opacity-50",
              )}
              aria-disabled={page >= totalPages}
            >
              التالي
            </Link>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
