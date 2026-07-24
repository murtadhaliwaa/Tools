"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartDatum } from "@/components/reports/bar-chart";

const SimpleBarChart = dynamic(
  () =>
    import("@/components/reports/bar-chart").then((m) => m.SimpleBarChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 w-full rounded-xl" />,
  },
);

export function MonthlyCharts({
  typeChart,
  categoryChart,
  topIssued,
}: {
  typeChart: ChartDatum[];
  categoryChart: ChartDatum[];
  topIssued: ChartDatum[];
}) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <SimpleBarChart title="الحركات حسب النوع" data={typeChart} />
        <SimpleBarChart title="الحركات حسب التصنيف" data={categoryChart} />
      </div>
      <SimpleBarChart title="أكثر الأدوات صرفاً (إجمالي)" data={topIssued} />
    </>
  );
}
