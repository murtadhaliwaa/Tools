import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import {
  getDashboardStats,
  getRecentTransactions,
} from "@/services/items";
import { formatDateTime } from "@/lib/format";
import { TransactionTypeBadge } from "@/components/shared/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Package, Wrench, Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

async function StatsSection({ organizationId }: { organizationId: string }) {
  const stats = await getDashboardStats(organizationId);
  const cards = [
    { title: "إجمالي الأدوات", value: stats.totalItems, icon: Package },
    { title: "متوفرة", value: stats.available, icon: CheckCircle2 },
    { title: "عند مكينة / بلا رصيد", value: stats.issued, icon: Package },
    { title: "تحت التصليح", value: stats.inRepair, icon: Wrench },
    { title: "حركات هذا الشهر", value: stats.monthTransactions, icon: Activity },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

async function RecentSection({ organizationId }: { organizationId: string }) {
  const recent = await getRecentTransactions(organizationId, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>آخر الحركات</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className={ui.subtitle}>لا توجد حركات بعد.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TransactionTypeBadge type={tx.type} />
                    <span className="font-medium">{tx.item.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tx.machine ? `المكينة: ${tx.machine.name} • ` : ""}
                    بواسطة {tx.performedBy.fullName}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(tx.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { profile } = await requireUser();

  return (
    <PageShell wide>
      <PageHeader
        title="لوحة التحكم"
        description={`مرحباً ${profile.fullName}`}
        actions={
          <Link href="/transactions/new" className={cn(buttonVariants())}>
            تسجيل صرف جديد
          </Link>
        }
      />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection organizationId={profile.organizationId} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <RecentSection organizationId={profile.organizationId} />
      </Suspense>
    </PageShell>
  );
}
