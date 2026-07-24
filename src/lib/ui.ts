/**
 * ثوابت واجهة موحّدة — استخدمها بدل تكرار className عبر الصفحات.
 * الألوان/الزوايا الحقيقية من توكنات `globals.css`.
 */
export const ui = {
  page: "space-y-4",
  pageWide: "space-y-6",
  title: "text-2xl font-bold tracking-tight",
  subtitle: "text-sm text-muted-foreground",
  filterLabel: "text-xs font-medium text-muted-foreground",
  field: "h-9",
  tableActions: "space-x-2 space-x-reverse text-center",
  emptyCell: "text-center text-muted-foreground",
  cardHover: "h-full transition-colors hover:bg-muted/40",
  /** صور عامة — زوايا منحنية موحّدة */
  image: "rounded-xl object-cover",
  /** أيقونة الشعار — الزوايا من ملف الصورة نفسه */
  brandImage: "shrink-0 rounded-none object-cover",
  saving: "جاري الحفظ...",
  deleting: "جاري الحذف...",
  loading: "جاري التحميل...",
} as const;

/** مسار أيقونة التطبيق المعتمدة (زوايا منحنية في الملف نفسه) */
export const APP_ICON_SRC = "/icons/v2/icon-192.png" as const;
