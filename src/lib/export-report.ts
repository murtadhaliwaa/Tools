/** تصدير تقارير من العميل — مكتبات ثقيلة عبر import ديناميكي */

export type ExportCell = string | number | null | undefined;
export type ExportRow = ExportCell[];

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function cellText(value: ExportCell) {
  return value == null ? "" : String(value);
}

/** لفّ النص داخل عرض العمود بدون قصّ */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const value = text.trim();
  if (!value) return [""];
  if (ctx.measureText(value).width <= maxWidth) return [value];

  const lines: string[] = [];
  const tokens = value.split(/\s+/);
  let current = "";

  const pushChunked = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      const next = chunk + ch;
      if (ctx.measureText(next).width <= maxWidth) {
        chunk = next;
      } else {
        if (chunk) lines.push(chunk);
        chunk = ch;
      }
    }
    current = chunk;
  };

  for (const word of tokens) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
      continue;
    }
    if (current) lines.push(current);
    if (ctx.measureText(word).width <= maxWidth) {
      current = word;
    } else {
      pushChunked(word);
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function downloadExcelReport(params: {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: ExportRow[];
}) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(params.sheetName ?? "التقرير");
  sheet.views = [{ rightToLeft: true, state: "normal" }];

  sheet.addRow(params.headers);
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { wrapText: true, vertical: "middle" };

  for (const row of params.rows) {
    const added = sheet.addRow(row.map(cellText));
    added.alignment = { wrapText: true, vertical: "middle" };
  }

  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const length = String(cell.value ?? "").length;
      if (length > max) max = Math.min(length + 2, 60);
    });
    column.width = max;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const name = params.filename.endsWith(".xlsx")
    ? params.filename
    : `${params.filename}.xlsx`;
  triggerDownload(
    new Blob([buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    name,
  );
}

/**
 * PDF بدون html2canvas (يتعارض مع ألوان oklch في Tailwind).
 * يرسم الجدول على Canvas بخط النظام ثم يضمّنه في jsPDF.
 */
export async function downloadPdfReport(params: {
  filename: string;
  title: string;
  headers: string[];
  rows: ExportRow[];
}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;

  const colCount = Math.max(params.headers.length, 1);
  const scale = 2;
  const padX = 20;
  const padY = 24;
  const titleSize = 16;
  const cellFont = colCount >= 5 ? 10 : 11;
  const lineHeight = colCount >= 5 ? 14 : 15;
  const cellPadX = 6;
  const cellPadY = 7;
  const minRowH = 32;
  const titleGap = 16;
  // عرض مناسب لـ A4 عمودي — يتجنّب صفحة أفقية صغيرة على الموبايل
  const tableWidth = Math.min(700, 140 + colCount * 110);

  // أعمدة أوسع للملاحظات/النصوص الطويلة (آخر عمود بصرياً في RTL = أول فهرس بيانات غالباً «ملاحظات»)
  const weights = params.headers.map((h) => {
    if (h.includes("ملاحظات") || h.includes("ملاحظ")) return 2.4;
    if (h.includes("تاريخ")) return 1.5;
    if (h.includes("بواسطة") || h.includes("اسم")) return 1.2;
    return 1;
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const colWidths = weights.map((w) => (tableWidth * w) / weightSum);

  const measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) throw new Error("تعذر إنشاء الرسم");
  measureCtx.font = `${cellFont}px Tahoma, "Segoe UI", Arial, sans-serif`;

  const headerLines = params.headers.map((header, i) =>
    wrapText(measureCtx, header, colWidths[i]! - cellPadX * 2),
  );
  const bodyLineRows = params.rows.map((row) =>
    params.headers.map((_, i) =>
      wrapText(measureCtx, cellText(row[i]), colWidths[i]! - cellPadX * 2),
    ),
  );

  const headerRowH = Math.max(
    minRowH,
    Math.max(...headerLines.map((l) => l.length)) * lineHeight + cellPadY * 2,
  );
  const bodyRowHeights = bodyLineRows.map((cells) =>
    Math.max(
      minRowH,
      Math.max(...cells.map((l) => l.length)) * lineHeight + cellPadY * 2,
    ),
  );
  const tableHeight =
    headerRowH + bodyRowHeights.reduce((sum, h) => sum + h, 0);
  const canvasW = tableWidth + padX * 2;
  const canvasH = padY * 2 + titleSize + titleGap + tableHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * scale;
  canvas.height = canvasH * scale;
  const rawCtx = canvas.getContext("2d");
  if (!rawCtx) throw new Error("تعذر إنشاء الرسم");
  const ctx = rawCtx;

  const maxCanvasCssHeight = Math.floor(32000 / scale);
  if (canvasH > maxCanvasCssHeight) {
    throw new Error(
      "التقرير كبير جداً لتصدير PDF دفعة واحدة — قلّص الفترة أو صدّر Excel",
    );
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${titleSize}px Tahoma, "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "#111111";
  ctx.fillText(params.title, canvasW / 2, padY + titleSize / 2);

  const tableTop = padY + titleSize + titleGap;
  const tableLeft = padX;

  // إزاحة الأعمدة من اليمين (RTL): العمود البصري 0 أقصى اليمين = آخر عمود بيانات أو العكس
  // نرسم الفهرس visualIndex من اليمين: col 0 = يمين الجدول = headers[0]
  function colX(visualIndex: number) {
    let x = tableLeft + tableWidth;
    for (let i = 0; i <= visualIndex; i++) {
      x -= colWidths[i]!;
    }
    return x;
  }

  function drawCellBox(
    visualIndex: number,
    y: number,
    height: number,
    lines: string[],
    header: boolean,
    zebra: boolean,
  ) {
    const x = colX(visualIndex);
    const width = colWidths[visualIndex]!;

    ctx.fillStyle = header ? "#1f1f1f" : zebra ? "#f7f7f7" : "#ffffff";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#d4d4d4";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = header ? "#ffffff" : "#111111";
    ctx.font = `${header ? "bold " : ""}${cellFont}px Tahoma, "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const blockH = lines.length * lineHeight;
    const startY = y + (height - blockH) / 2 + lineHeight / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, x + width / 2, startY + i * lineHeight);
    });
  }

  let y = tableTop;
  params.headers.forEach((_, visualIndex) => {
    drawCellBox(visualIndex, y, headerRowH, headerLines[visualIndex]!, true, false);
  });
  y += headerRowH;

  bodyLineRows.forEach((cells, rowIndex) => {
    const height = bodyRowHeights[rowIndex]!;
    cells.forEach((lines, visualIndex) => {
      drawCellBox(
        visualIndex,
        y,
        height,
        lines,
        false,
        rowIndex % 2 === 1,
      );
    });
    y += height;
  });

  // دائماً عمودي — أوضح على الموبايل والطابعة العادية
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 22;
  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvasH * imgWidth) / canvasW;
  const imgData = canvas.toDataURL("image/png");

  let heightLeft = imgHeight;
  let position = margin;

  doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    position = margin - (imgHeight - heightLeft);
    doc.addPage();
    doc.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  const name = params.filename.endsWith(".pdf")
    ? params.filename
    : `${params.filename}.pdf`;
  doc.save(name);
}
