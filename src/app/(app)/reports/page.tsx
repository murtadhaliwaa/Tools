import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { ui } from "@/lib/ui";

const REPORTS = [
  {
    href: "/reports/issues",
    title: "تقرير الصرف",
    description: "كل عمليات الصرف في فترة (هذا الأسبوع افتراضياً) مع تصدير",
  },
  {
    href: "/reports/inventory",
    title: "جرد المخزون",
    description: "كل المواد ورصيدها الحالي في المخزن مع تصدير",
  },
  {
    href: "/reports/machine",
    title: "تقرير مكينة",
    description: "الأدوات المصروفة لمكينة خلال فترة",
  },
  {
    href: "/reports/material",
    title: "تقرير مادة",
    description: "حالة مادة معينة وحركاتها خلال فترة",
  },
  {
    href: "/reports/status",
    title: "تقرير حالة التصليح",
    description: "الأدوات تحت التصليح حالياً ومنذ متى",
  },
  {
    href: "/reports/monthly",
    title: "تقرير شهري عام",
    description: "ملخص الحركات حسب النوع والتصنيف",
    adminOnly: true,
  },
  {
    href: "/reports/item",
    title: "سجل أداة",
    description: "الخط الزمني الكامل لحركة أداة",
  },
] as const;

export default async function ReportsPage() {
  const { profile } = await requireUser();
  const reports = REPORTS.filter(
    (r) => !("adminOnly" in r && r.adminOnly) || profile.role === "ADMIN",
  );

  return (
    <PageShell>
      <PageHeader
        title="التقارير"
        description="اختر نوع التقرير المطلوب"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((report) => (
          <Link key={report.href} href={report.href} prefetch={false}>
            <Card className={ui.cardHover}>
              <CardHeader>
                <CardTitle>{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
