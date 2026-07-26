"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  downloadExcelReport,
  downloadPdfReport,
  type ExportRow,
} from "@/lib/export-report";
import { LoadingButton } from "@/components/shared/loading-button";

type ExportFormat = "excel" | "pdf";

type ExportButtonsProps = {
  filename: string;
  title?: string;
  headers: string[];
  sheetName?: string;
  /** إن وُجدت تُستخدم مباشرة؛ وإلا يُستدعى getRows عند الضغط */
  rows?: ExportRow[];
  /** جلب الصفوف عند التصدير فقط — يقلل حجم RSC */
  getRows?: () => Promise<ExportRow[]>;
  enabled?: boolean;
};

export function ExportButtons({
  filename,
  title = "تقرير",
  headers,
  rows,
  getRows,
  sheetName = "التقرير",
  enabled = true,
}: ExportButtonsProps) {
  const [pending, setPending] = useState<ExportFormat | null>(null);
  const busy = pending !== null;
  const disabled = !enabled || busy;

  async function exportAs(format: ExportFormat) {
    try {
      setPending(format);
      const data = getRows ? await getRows() : (rows ?? []);
      if (data.length === 0) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      if (format === "excel") {
        await downloadExcelReport({ filename, sheetName, headers, rows: data });
      } else {
        await downloadPdfReport({ filename, title, headers, rows: data });
      }
      toast.success(format === "excel" ? "تم تصدير Excel" : "تم تصدير PDF");
    } catch (error) {
      console.error("export failed", error);
      toast.error("تعذر التصدير، حاول مرة أخرى");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        loading={pending === "excel"}
        loadingText="جاري Excel..."
        disabled={disabled}
        onClick={() => void exportAs("excel")}
      >
        Excel
      </LoadingButton>
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        loading={pending === "pdf"}
        loadingText="جاري PDF..."
        disabled={disabled}
        onClick={() => void exportAs("pdf")}
      >
        PDF
      </LoadingButton>
    </div>
  );
}

/** توافق مع الاستيرادات القديمة */
export function ExportCsvButton(props: ExportButtonsProps & { label?: string }) {
  return <ExportButtons {...props} />;
}
