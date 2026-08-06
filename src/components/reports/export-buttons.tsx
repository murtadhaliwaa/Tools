"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  downloadExcelReport,
  downloadPdfReport,
  type ExportRow,
} from "@/lib/export-report";
import {
  EXPORT_LIMIT_HINT,
} from "@/lib/export-limits";
import { LoadingButton } from "@/components/shared/loading-button";

type ExportFormat = "excel" | "pdf";

export type ExportPayload = {
  rows: ExportRow[];
  truncated?: boolean;
  limit?: number;
  total?: number;
  error?: string;
};

type ExportButtonsProps = {
  filename: string;
  title?: string;
  headers: string[];
  sheetName?: string;
  rows?: ExportRow[];
  getRows?: () => Promise<ExportPayload | ExportRow[]>;
  enabled?: boolean;
  /** تلميح حدّ التصدير قبل الضغط */
  limitHint?: string;
};

function normalizePayload(
  data: ExportPayload | ExportRow[],
): ExportPayload {
  return Array.isArray(data) ? { rows: data } : data;
}

export function ExportButtons({
  filename,
  title = "تقرير",
  headers,
  rows,
  getRows,
  sheetName = "التقرير",
  enabled = true,
  limitHint = EXPORT_LIMIT_HINT,
}: ExportButtonsProps) {
  const [pending, setPending] = useState<ExportFormat | null>(null);
  const busy = pending !== null;
  const disabled = !enabled || busy;

  async function exportAs(format: ExportFormat) {
    try {
      setPending(format);
      const payload = normalizePayload(
        getRows ? await getRows() : { rows: rows ?? [] },
      );
      if (payload.error) {
        toast.error(payload.error);
        return;
      }
      if (payload.rows.length === 0) {
        toast.error("لا توجد بيانات للتصدير");
        return;
      }
      if (format === "excel") {
        await downloadExcelReport({
          filename,
          sheetName,
          headers,
          rows: payload.rows,
        });
      } else {
        await downloadPdfReport({
          filename,
          title,
          headers,
          rows: payload.rows,
        });
      }
      if (payload.truncated) {
        toast.success(
          `تم التصدير (أول ${payload.limit ?? payload.rows.length} من ${payload.total ?? "?"} صف). قلّص الفترة لاستخراج الباقي.`,
        );
      } else {
        toast.success(format === "excel" ? "تم تصدير Excel" : "تم تصدير PDF");
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "export.failed",
          ts: new Date().toISOString(),
        }),
      );
      toast.error(
        error instanceof Error && /[\u0600-\u06FF]/.test(error.message)
          ? error.message
          : "تعذر التصدير، حاول مرة أخرى",
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-1.5">
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
      {limitHint ? (
        <p className="text-xs text-muted-foreground">{limitHint}</p>
      ) : null}
    </div>
  );
}
