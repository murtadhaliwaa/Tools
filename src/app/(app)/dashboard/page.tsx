import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getDashboardStatsCached } from "@/lib/cache";
import { getLowStockItems, getRecentTransactions } from "@/services/dashboard";
import { formatDateTime } from "@/lib/format";
import {
  LowStockBadge,
  TransactionTypeBadge,
} from "@/components/shared/status-badge";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import {
  Package,
  Wrench,
  Activity,
  CheckCircle2,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ui } from "@/lib/ui";

function StatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

async function StatsSection({ organizationId }: { organizationId: string }) {
  const stats = await getDashboardStatsCached(organizationId);
  const cards = [
    { title: "إجمالي الأدوات", value: stats.totalItems, icon: Package },
    { title: "متوفرة", value: stats.available, icon: CheckCircle2 },
    { title: "عند مكينة / بلا رصيد", value: stats.issued, icon: Package },
    { title: "تحت التصليح", value: stats.inRepair, icon: Wrench },
    {
      title: "مخزون منخفض",
      value: stats.lowStock,
      icon: TriangleAlert,
      href: stats.lowStock > 0 ? "/items?stock=low" : undefined,
    },
    { title: "حركات هذا الشهر", value: stats.monthTransactions, icon: Activity },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const body = (
          <>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{card.value}</p>
            </CardContent>
          </>
        );

        if (card.href) {
          return (
            <Link
              key={card.title}
              href={card.href}
              className={cn(ui.cardHover, "rounded-xl block")}
            >
              <Card className="h-full border-destructive/40">{body}</Card>
            </Link>
          );
        }

        return <Card key={card.title}>{body}</Card>;
      })}
    </div>
  );
}

async function LowStockSection({ organizationId }: { organizationId: string }) {
  const items = await getLowStockItems(organizationId, 8);
  if (items.length === 0) return null;

  return (
    <Card className="border-destructive/40">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TriangleAlert className="size-4 text-destructive" />
          تنبيه نفاد المخزون
        </CardTitle>
        <Link
          href="/items?stock=low"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          عرض الكل
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  <LowStockBadge
                    quantity={item.quantity}
                    minQuantity={item.minQuantity}
                  />
                </div>
                {item.code ? (
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {item.code}
                  </p>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground" dir="ltr">
                {item.quantity} / حد {item.minQuantity}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
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

      <Suspense fallback={null}>
        <LowStockSection organizationId={profile.organizationId} />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <RecentSection organizationId={profile.organizationId} />
      </Suspense>
    </PageShell>
  );
}
