import { requireUser } from "@/lib/auth";
import { getItemFilterOptionsCached } from "@/lib/cache";
import { getItemTimeline } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { ItemTimelineExport } from "@/components/reports/report-export-buttons";
import { TransactionTypeBadge } from "@/components/shared/status-badge";
import { ItemReportFilters } from "@/components/reports/item-report-filters";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ItemTimelinePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const itemId = param(sp.itemId);

  const items = await getItemFilterOptionsCached(profile.organizationId);

  const timeline = itemId
    ? await getItemTimeline({
        organizationId: profile.organizationId,
        itemId,
      })
    : [];

  const itemName = items.find((i) => i.id === itemId)?.name ?? "";

  return (
    <PageShell>
      <PageHeader
        title="سجل أداة"
        description="الخط الزمني الكامل لحركات الأداة"
        actions={
          itemId ? (
            <ItemTimelineExport
              filename={`item-timeline-${itemName || "item"}`}
              title={`سجل أداة — ${itemName}`}
              sheetName="سجل"
              enabled={timeline.length > 0}
              itemId={itemId}
            />
          ) : null
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">اختر الأداة</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemReportFilters items={items} initialItemId={itemId} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد حركات</p>
          ) : (
            <ol className="relative space-y-6 border-s border-border ps-6">
              {timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -start-[1.4rem] top-1 size-3 rounded-full bg-primary" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <TransactionTypeBadge type={event.type} />
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(event.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm">
                      بواسطة {event.performedBy.fullName}
                      {event.machine ? ` • ${event.machine.name}` : ""}
                    </p>
                    {event.notes ? (
                      <p className="text-sm text-muted-foreground">
                        {event.notes}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
