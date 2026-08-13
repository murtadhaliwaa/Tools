/** YYYY-MM-DD بالتقويم المحلي */
export function formatYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** بداية الأسبوع (الاثنين) */
export function startOfWeekMonday(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** من الاثنين حتى اليوم — افتراضي «صرف هذا الأسبوع» */
export function defaultWeekRange(): { from: string; to: string } {
  const today = new Date();
  return {
    from: formatYmdLocal(startOfWeekMonday(today)),
    to: formatYmdLocal(today),
  };
}
