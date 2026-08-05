/** مساعدات موحّدة لمعاملات البحث في صفحات App Router */

export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** نهاية اليوم المحلي لنطاق تاريخ inclusive على عمود DateTime */
export function parseDayEnd(dateYmd: string | undefined): Date | undefined {
  if (!dateYmd) return undefined;
  return new Date(`${dateYmd}T23:59:59`);
}

export function parseDayStart(dateYmd: string | undefined): Date | undefined {
  if (!dateYmd) return undefined;
  return new Date(`${dateYmd}T00:00:00`);
}
