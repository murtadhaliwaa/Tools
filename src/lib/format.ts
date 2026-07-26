import { format } from "date-fns";
import { ar } from "date-fns/locale";

export function formatDateTime(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy • HH:mm", { locale: ar });
}

export function formatDate(date: Date | string) {
  return format(new Date(date), "dd MMM yyyy", { locale: ar });
}
