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

  for (const row of params.rows) {
    sheet.addRow(row.map(cellText));
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
  const padX = 24;
  const padY = 28;
  const titleSize = 18;
  const cellFont = 12;
  const rowH = 34;
  const titleGap = 20;
  const tableWidth = Math.min(900, 160 + colCount * 140);
  const colW = tableWidth / colCount;
  const tableHeight = rowH * (params.rows.length + 1);
  const canvasW = tableWidth + padX * 2;
  const canvasH = padY * 2 + titleSize + titleGap + tableHeight;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW * scale;
  canvas.height = canvasH * scale;
  const rawCtx = canvas.getContext("2d");
  if (!rawCtx) throw new Error("تعذر إنشاء الرسم");
  const ctx = rawCtx;

  // حد آمن لارتفاع Canvas في المتصفحات (~32767px)
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

  function drawCell(
    text: string,
    col: number,
    row: number,
    header: boolean,
  ) {
    const x = tableLeft + col * colW;
    const y = tableTop + row * rowH;

    ctx.fillStyle = header ? "#1f1f1f" : row % 2 === 0 ? "#ffffff" : "#f7f7f7";
    ctx.fillRect(x, y, colW, rowH);
    ctx.strokeStyle = "#d4d4d4";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, colW, rowH);

    ctx.fillStyle = header ? "#ffffff" : "#111111";
    ctx.font = `${header ? "bold " : ""}${cellFont}px Tahoma, "Segoe UI", Arial, sans-serif`;

    const maxChars = Math.max(8, Math.floor(colW / 7));
    const label =
      text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text;
    ctx.fillText(label, x + colW / 2, y + rowH / 2);
  }

  // أعمدة RTL: العمود 0 يمين الجدول
  params.headers.forEach((header, visualIndex) => {
    const col = colCount - 1 - visualIndex;
    drawCell(header, col, 0, true);
  });

  params.rows.forEach((row, rowIndex) => {
    params.headers.forEach((_, visualIndex) => {
      const col = colCount - 1 - visualIndex;
      drawCell(cellText(row[visualIndex]), col, rowIndex + 1, false);
    });
  });

  const orientation = colCount > 4 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 28;
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
