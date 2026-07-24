"use client";

import { useState } from "react";
import { downloadCsv } from "@/lib/format";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";

type ExportRow = Array<string | number | null | undefined>;

async function downloadExcel(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: ExportRow[],
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    sheet.addRow(row.map((cell) => (cell == null ? "" : cell)));
  }

  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = String(cell.value ?? "").length;
      if (length > max) max = Math.min(length + 2, 40);
    });
    column.width = max;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons({
  filename,
  headers,
  rows,
  sheetName = "التقرير",
}: {
  filename: string;
  headers: string[];
  rows: ExportRow[];
  sheetName?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => downloadCsv(filename, headers, rows)}
      >
        تصدير CSV
      </Button>
      <LoadingButton
        type="button"
        variant="outline"
        size="sm"
        loading={pending}
        loadingText="جاري Excel..."
        disabled={rows.length === 0}
        onClick={async () => {
          try {
            setPending(true);
            await downloadExcel(filename, sheetName, headers, rows);
          } finally {
            setPending(false);
          }
        }}
      >
        تصدير Excel
      </LoadingButton>
    </div>
  );
}

/** للتوافق مع الاستيرادات القديمة */
export function ExportCsvButton(props: {
  filename: string;
  headers: string[];
  rows: ExportRow[];
  label?: string;
  sheetName?: string;
}) {
  return <ExportButtons {...props} />;
}
