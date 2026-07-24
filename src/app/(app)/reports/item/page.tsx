import { requireUser } from "@/lib/auth";
import { getItemFilterOptionsCached } from "@/lib/cache";
import { getItemTimeline } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { TransactionTypeLabel } from "@/types/domain";
import { ExportCsvButton } from "@/components/reports/export-csv-button";
import { TransactionTypeBadge } from "@/components/shared/status-badge";
import { ItemReportFilters } from "@/components/reports/item-report-filters";
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">سجل أداة</h1>
          <p className="text-sm text-muted-foreground">
            الخط الزمني الكامل لحركات الأداة
          </p>
        </div>
        {timeline.length > 0 ? (
          <ExportCsvButton
            filename={`item-timeline-${itemName}`}
            headers={["النوع", "المكينة", "بواسطة", "التاريخ", "ملاحظات"]}
            rows={timeline.map((t) => [
              TransactionTypeLabel[t.type],
              t.machine?.name,
              t.performedBy.fullName,
              formatDateTime(t.createdAt),
              t.notes,
            ])}
          />
        ) : null}
      </div>

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
    </div>
  );
}
