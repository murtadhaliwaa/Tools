import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy • HH:mm", { locale: ar });
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy", { locale: ar });
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
) {
  const escape = (value: string | number | null | undefined) => {
    const str = value == null ? "" : String(value);
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const content = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
