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

type PdfTableLayout = {
  scale: number;
  padX: number;
  padY: number;
  titleSize: number;
  titleGap: number;
  cellFont: number;
  lineHeight: number;
  tableWidth: number;
  tableLeft: number;
  canvasW: number;
  colWidths: number[];
  headerRowH: number;
  headerLines: string[][];
  bodyLineRows: string[][][];
  bodyRowHeights: number[];
};

function buildPdfTableLayout(
  headers: string[],
  rows: ExportRow[],
): PdfTableLayout {
  const colCount = Math.max(headers.length, 1);
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
  const tableWidth = Math.min(700, 140 + colCount * 110);

  const weights = headers.map((h) => {
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

  const headerLines = headers.map((header, i) =>
    wrapText(measureCtx, header, colWidths[i]! - cellPadX * 2),
  );
  const bodyLineRows = rows.map((row) =>
    headers.map((_, i) =>
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

  return {
    scale,
    padX,
    padY,
    titleSize,
    titleGap,
    cellFont,
    lineHeight,
    tableWidth,
    tableLeft: padX,
    canvasW: tableWidth + padX * 2,
    colWidths,
    headerRowH,
    headerLines,
    bodyLineRows,
    bodyRowHeights,
  };
}

function paginatePdfRows(
  layout: PdfTableLayout,
  usableFirstPageCss: number,
  usableNextPageCss: number,
): number[][] {
  const { headerRowH, bodyRowHeights } = layout;
  const pages: number[][] = [];
  let currentRows: number[] = [];
  let currentHeight = headerRowH;
  let isFirstPage = true;

  for (let rowIndex = 0; rowIndex < bodyRowHeights.length; rowIndex++) {
    const rowH = bodyRowHeights[rowIndex]!;
    const limit = isFirstPage ? usableFirstPageCss : usableNextPageCss;

    if (currentHeight + rowH > limit && currentRows.length > 0) {
      pages.push(currentRows);
      currentRows = [];
      currentHeight = headerRowH;
      isFirstPage = false;
    }

    currentRows.push(rowIndex);
    currentHeight += rowH;
  }

  if (currentRows.length > 0 || pages.length === 0) {
    pages.push(currentRows);
  }

  return pages;
}

function renderPdfPageCanvas(
  title: string,
  layout: PdfTableLayout,
  rowIndices: number[],
  showTitle: boolean,
): HTMLCanvasElement {
  const {
    scale,
    padX,
    padY,
    titleSize,
    titleGap,
    cellFont,
    lineHeight,
    tableWidth,
    tableLeft,
    canvasW,
    colWidths,
    headerRowH,
    headerLines,
    bodyLineRows,
    bodyRowHeights,
  } = layout;

  const titleBlockH = showTitle ? titleSize + titleGap : 0;
  const tableHeight =
    headerRowH +
    rowIndices.reduce((sum, i) => sum + bodyRowHeights[i]!, 0);
  const canvasH = padY * 2 + titleBlockH + tableHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * scale;
  canvas.height = canvasH * scale;
  const rawCtx = canvas.getContext("2d");
  if (!rawCtx) throw new Error("تعذر إنشاء الرسم");
  const ctx = rawCtx;

  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (showTitle) {
    ctx.font = `bold ${titleSize}px Tahoma, "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = "#111111";
    ctx.fillText(title, canvasW / 2, padY + titleSize / 2);
  }

  const tableTop = padY + titleBlockH;

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
  headerLines.forEach((lines, visualIndex) => {
    drawCellBox(visualIndex, y, headerRowH, lines, true, false);
  });
  y += headerRowH;

  rowIndices.forEach((rowIndex) => {
    const height = bodyRowHeights[rowIndex]!;
    bodyLineRows[rowIndex]!.forEach((lines, visualIndex) => {
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

  return canvas;
}

/**
 * PDF بدون html2canvas (يتعارض مع ألوان oklch في Tailwind).
 * يرسم كل صفحة على Canvas منفصل مع تقسيم عند حدود الصفوف — لا يُقطع الصف من المنتصف.
 */
export async function downloadPdfReport(params: {
  filename: string;
  title: string;
  headers: string[];
  rows: ExportRow[];
}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;

  const layout = buildPdfTableLayout(params.headers, params.rows);
  const { scale, padY, titleSize, titleGap, canvasW, headerRowH, bodyRowHeights } =
    layout;

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 22;
  const imgWidth = pageWidth - margin * 2;

  const cssToPt = imgWidth / canvasW;
  const contentHeightPt = pageHeight - margin * 2;
  const titleBlockCss = titleSize + titleGap;
  const usableFirstPageCss =
    contentHeightPt / cssToPt - padY * 2 - titleBlockCss;
  const usableNextPageCss = contentHeightPt / cssToPt - padY * 2;

  const singleRowTooTall =
    bodyRowHeights.length > 0 &&
    headerRowH + bodyRowHeights[0]! >
      Math.max(usableFirstPageCss, usableNextPageCss);
  if (singleRowTooTall) {
    throw new Error("صف في التقرير أطول من الصفحة — قلّص النص أو صدّر Excel");
  }

  const pages = paginatePdfRows(
    layout,
    usableFirstPageCss,
    usableNextPageCss,
  );

  pages.forEach((rowIndices, pageIndex) => {
    if (pageIndex > 0) doc.addPage();

    const pageCanvas = renderPdfPageCanvas(
      params.title,
      layout,
      rowIndices,
      pageIndex === 0,
    );
    const pageCanvasH = pageCanvas.height / scale;
    const imgHeight = pageCanvasH * cssToPt;
    const imgData = pageCanvas.toDataURL("image/png");
    doc.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
  });

  const name = params.filename.endsWith(".pdf")
    ? params.filename
    : `${params.filename}.pdf`;
  doc.save(name);
}
