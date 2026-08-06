"use client";

import {
  loadItemTimelineExportRows,
  loadMachineExportRows,
  loadMaterialExportRows,
  loadMonthlyExportRows,
  loadRepairStatusExportRows,
} from "@/actions/export-reports";
import { ExportButtons } from "@/components/reports/export-buttons";
import {
  EXPORT_LIMIT_HINT,
  TIMELINE_EXPORT_LIMIT_HINT,
} from "@/lib/export-limits";

type Common = {
  filename: string;
  title: string;
  sheetName?: string;
  enabled: boolean;
};

export function MachineReportExport(
  props: Common & {
    machineId: string;
    from?: string;
    to?: string;
  },
) {
  const { machineId, from, to, ...rest } = props;
  return (
    <ExportButtons
      {...rest}
      limitHint={EXPORT_LIMIT_HINT}
      headers={["الأداة", "الرمز", "التاريخ", "بواسطة", "ملاحظات"]}
      getRows={() => loadMachineExportRows({ machineId, from, to })}
    />
  );
}

export function ItemTimelineExport(
  props: Common & { itemId: string },
) {
  const { itemId, ...rest } = props;
  return (
    <ExportButtons
      {...rest}
      limitHint={TIMELINE_EXPORT_LIMIT_HINT}
      headers={["النوع", "المكينة", "بواسطة", "التاريخ", "ملاحظات"]}
      getRows={() => loadItemTimelineExportRows({ itemId })}
    />
  );
}

export function MaterialReportExport(
  props: Common & {
    itemId: string;
    from?: string;
    to?: string;
  },
) {
  const { itemId, from, to, ...rest } = props;
  return (
    <ExportButtons
      {...rest}
      limitHint={EXPORT_LIMIT_HINT}
      headers={["النوع", "المكينة", "بواسطة", "التاريخ", "ملاحظات"]}
      getRows={() => loadMaterialExportRows({ itemId, from, to })}
    />
  );
}

export function RepairStatusExport(props: Common) {
  return (
    <ExportButtons
      {...props}
      limitHint={EXPORT_LIMIT_HINT}
      headers={["الأداة", "الرمز", "التصنيف", "منذ"]}
      getRows={() => loadRepairStatusExportRows()}
    />
  );
}

export function MonthlyReportExport(
  props: Common & { year: number; month: number },
) {
  const { year, month, ...rest } = props;
  return (
    <ExportButtons
      {...rest}
      limitHint={EXPORT_LIMIT_HINT}
      headers={["القسم", "الاسم", "العدد"]}
      getRows={() => loadMonthlyExportRows({ year, month })}
    />
  );
}
