import { requireUser } from "@/lib/auth";
import { getItemFilterOptionById } from "@/services/catalog";
import { getItemTimeline, REPORT_PAGE_SIZE } from "@/services/reports";
import { formatDateTime } from "@/lib/format";
import { ItemTimelineExport } from "@/components/reports/report-export-buttons";
import { TransactionTypeBadge } from "@/components/shared/status-badge";
import { ItemReportFilters } from "@/components/reports/item-report-filters";
import { PagePagination } from "@/components/shared/page-pagination";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { param, parsePage, type SearchParams } from "@/lib/search-params";

export default async function ItemTimelinePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { profile } = await requireUser();
  const sp = await searchParams;
  const itemId = param(sp.itemId);
  const page = parsePage(sp.page);

  const [timeline, initialItem] = await Promise.all([
    itemId
      ? getItemTimeline({
          organizationId: profile.organizationId,
          itemId,
          page,
          pageSize: REPORT_PAGE_SIZE,
        })
      : Promise.resolve(null),
    itemId
      ? getItemFilterOptionById(profile.organizationId, itemId)
      : Promise.resolve(null),
  ]);

  const itemName = initialItem?.name ?? "";

  function hrefFor(nextPage: number) {
    const q = new URLSearchParams();
    q.set("page", String(nextPage));
    if (itemId) q.set("itemId", itemId);
    return `/reports/item?${q.toString()}`;
  }

  return (
    <PageShell>
      <PageHeader
        title="سجل أداة"
        description={
          timeline
            ? `${timeline.total} حركة`
            : "الخط الزمني الكامل لحركات الأداة"
        }
        actions={
          itemId ? (
            <ItemTimelineExport
              filename={`item-timeline-${itemName || "item"}`}
              title={`سجل أداة — ${itemName}`}
              sheetName="سجل"
              enabled={(timeline?.total ?? 0) > 0}
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
          <ItemReportFilters
            initialItemId={itemId}
            initialItem={initialItem}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {!timeline || timeline.rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {itemId
                ? "لا توجد حركات لهذه الأداة"
                : "اختر أداة ثم اعرض السجل"}
            </p>
          ) : (
            <ol className="relative space-y-6 border-s border-border ps-6">
              {timeline.rows.map((event) => (
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

      {timeline ? (
        <PagePagination
          page={timeline.page}
          totalPages={timeline.totalPages}
          hrefFor={hrefFor}
        />
      ) : null}
    </PageShell>
  );
}
